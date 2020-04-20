import collections
import datetime

from qmlist import model
from qmlist.rtm import rtmlib

def prepare_item_list(products_query, shopping_list_name, pageno, item_count):
    products_paginator = products_query.order_by(model.Product.name).paginate(pageno, item_count, False)

    items_json = []
    for product in products_paginator.items:
        edited = {
            "name": product.name != product.original_name,
            "price": product.price != product.original_price
        }
        shopping_list_product = product.demand.filter_by(shopping_list_name=shopping_list_name).first()
        items_json.append({
            "sku": product.sku,
            "name": product.name,
            "store": product.store,
            "quantity": shopping_list_product.quantity if shopping_list_product else 0,
            "price": product.price,
            "edited": edited
        })

    page_json = {"last": products_paginator.pages, "current": products_paginator.page}
    if products_paginator.has_next:
        page_json["next"] = pageno + 1
    if products_paginator.has_prev:
        page_json["prev"] = pageno - 1

    return {"items": items_json, "page": page_json, "total-results": products_query.count()}

def get_list_info_raw(archived=None):
    if archived is None:
        table = model.ShoppingList.query
    elif archived:
        table = model.ShoppingList.archived()
    else:
        table = model.ShoppingList.active()

    list_info = []
    for shopping_list in table.all():
        list_info.append({
            "name": shopping_list.name,
            "departure": shopping_list.departure
        })
    return list_info

def get_users_info(email=None):
    def _user_info(user):
        department = user.department
        return {
            "name": user.name,
            "email": user.email,
            "role": user.roles[0].name,
            "department": department.name if department else None
        }
    user_query = model.User.query.filter_by(email=email) if email else model.User.query
    return [_user_info(user) for user in user_query.all() if not user.has_role("root")]

def get_departments_info(name=None):
    def _department_info(department):
        return {
            "id": department.id,
            "name": department.name,
            "users": [user.email for user in department.users],
            "lists": [shopping_list.name for shopping_list in department.lists]
        }
    department_query = model.Department.query.filter_by(name=name) if name else model.Department.query
    return [_department_info(department) for department in department_query.all()]

def get_category_path(category):
    if category:
        return get_category_path(category.parent) + [category]
    else:
        return []

def get_store_categories_query(current_category, store_name):
    if current_category:
        if current_category.children.count():
            return current_category.children
        elif current_category.parent:
            return current_category.parent.children
    return model.Categories.enabled().filter_by(store=store_name, parentid=None)

def set_category_tree_enabled(category, enabled):
    category.isenabled = enabled
    for subcategory in category.children:
        set_category_tree_enabled(subcategory, enabled)

def parse_price(price_str):
    price = float(price_str)
    if price <= 0:
        raise ValueError("Price cannot be negative.")

    return round(price, 2)

def export_list_to_rtm(shopping_list_name):
    rtm_client = rtmlib.connect()

    shopping_list = model.ShoppingList.query.filter_by(name=shopping_list_name).one()
    if shopping_list.rtmid:
        # Archive a list instead of deleting it since a deleted list's tasks go
        # to the Inbox, meaning they still show up in tag filters.
        rtmlib.archive_list(rtm_client, shopping_list.rtmid)
        shopping_list.rtmid = None

    rtm_list = rtmlib.create_list(rtm_client, shopping_list_name)
    shopping_list.rtmid = rtm_list.id
    model.db.session.commit()

    inventory_dict = collections.defaultdict(list)
    for entry in shopping_list.inventory:
        tags = (entry.product.store.replace(" ", "-"),)
        inventory_dict[tags].append(f"{entry.product.name} -- {entry.quantity}")

    departure = datetime.datetime.fromtimestamp(shopping_list.departure)
    for tags, entries in inventory_dict.items():
        rtmlib.add_to_list(rtm_client, rtm_list.id, *list(sorted(entries)), due_date=departure, tags=tags)