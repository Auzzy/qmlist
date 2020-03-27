import datetime
import itertools
import os
from operator import attrgetter, itemgetter

import sqlalchemy
from flask import jsonify, render_template, request
from flask_login import logout_user
from flask_security import current_user, login_required, roles_required

from qmlist import model, qmlist
from qmlist.qmlist import app
from qmlist.shoppinglist import shoppinglist


ITEM_PAGE_SIZE = 100
_SHOPPING_LISTS = {}
ALL_CATEGORY = "All"
DEPARTURE_FORMAT = "%a %d-%b-%Y %H:%M"

def get_shopping_list(name):
    global _SHOPPING_LISTS

    if name not in _SHOPPING_LISTS:
        _SHOPPING_LISTS[name] = {}

    if current_user.id not in _SHOPPING_LISTS[name]:
        shopping_list_db = model.ShoppingList.active().filter_by(name=name).one()
        tags = [current_user.department.tag] if current_user.department and current_user.department.tag else []
        _SHOPPING_LISTS[name][current_user.id] = shoppinglist.PersistentShoppingList.load(
            name, shopping_list_db.rtmid, shopping_list_db.departure, tags)
    return _SHOPPING_LISTS[name][current_user.id]

def delete_shopping_list(name):
    if name in _SHOPPING_LISTS:
        del _SHOPPING_LISTS[name]

@app.route("/")
@login_required
def home():
    default_list = model.ShoppingList.next()
    default_list_name = default_list.name if default_list else None
    return render_template('index.html', default_list_name=default_list_name, is_admin=current_user.has_role("admin"))

def _prepare_item_list(products_query, shopping_list_name, pageno, item_count):
    products_paginator = products_query.order_by(model.Product.name).paginate(pageno, item_count, False)

    shopping_list = get_shopping_list(shopping_list_name) if shopping_list_name else None
    items_json = []
    for product in products_paginator.items:
        item = shopping_list.get_item(product.name) if shopping_list else None
        edited = {
            "name": product.name != product.original_name,
            "price": product.price != product.original_price
        }
        items_json.append({
            "sku": product.sku,
            "name": item.name if item else product.name,
            "store": product.store,
            "quantity": item.quantity if item else None,
            "price": product.price,
            "edited": edited
        })

    page_json = {"last": products_paginator.pages, "current": products_paginator.page}
    if products_paginator.has_next:
        page_json["next"] = pageno + 1
    if products_paginator.has_prev:
        page_json["prev"] = pageno - 1

    return jsonify({"items": items_json, "page": page_json, "total-results": products_query.count()})

@app.route("/search")
@login_required
def search():
    shopping_list_name = request.args.get("shopping-list")
    search_term = request.args["search"]
    pageno = int(request.args.get("pageno", 1))
    item_count = int(request.args.get("item-count", 25))

    search_results = model.Product.active().filter(sqlalchemy.func.lower(model.Product.name).contains(search_term.lower()))
    return _prepare_item_list(search_results, shopping_list_name, pageno, item_count)

def _get_category_path(category):
    if category:
        return _get_category_path(category.parent) + [category]
    else:
        return []

def _get_store_categories_query(current_category, store_name):
    if current_category:
        if current_category.children.count():
            return current_category.children
        elif current_category.parent:
            return current_category.parent.children
    return model.Categories.query.filter_by(store=store_name, parentid=None)

@app.route("/browse/stores")
@login_required
def browse_stores():
    store_name = request.args["storeName"]
    category = request.args.get("category", ALL_CATEGORY)

    current_category = model.Categories.query.filter_by(store=store_name, name=category).one() if category != ALL_CATEGORY else None
    current_category_path = [ALL_CATEGORY] + [category.name for category in _get_category_path(current_category)]

    store_categories_query = _get_store_categories_query(current_category, store_name).order_by(model.Categories.name)
    store_categories_json = [{"name": category.name, "id": category.id} for category in store_categories_query.all()]
    sorted_store_categories_json = list(sorted(store_categories_json, key=itemgetter("name")))

    return jsonify({"store-categories": sorted_store_categories_json, "current-category": current_category_path})

def _get_subcategories(category):
    categories = [category]
    for subcategory in category.children:
        categories.extend(_get_subcategories(subcategory))
    return categories

@app.route("/browse/items/")
@login_required
def browse_items_page():
    shopping_list_name = request.args.get("shopping-list")
    store_name = request.args["store-name"]
    category_name = request.args.get("category", ALL_CATEGORY)
    pageno = int(request.args.get("pageno", 1))
    item_count = int(request.args.get("item-count", 25))

    store_products_query = model.Product.active().filter_by(store=store_name)
    if category_name != ALL_CATEGORY:
        current_category = model.Categories.query.filter_by(store=store_name, name=category_name).one()

        subcategory_ids = [subcategory.id for subcategory in _get_subcategories(current_category)]
        store_products_query = store_products_query.filter(model.Product.categoryid.in_(subcategory_ids))

    return _prepare_item_list(store_products_query, shopping_list_name, pageno, item_count)

@app.route("/load-list")
@login_required
def load_shopping_list():
    shopping_list_name = request.args["shopping-list"]
    shopping_list = get_shopping_list(shopping_list_name)

    sorted_items = sorted(shopping_list.get_items_json(), key=itemgetter("name"))
    return jsonify({"shopping-list": sorted_items, "editable": shopping_list.is_editable(), "departure": shopping_list.departure})

@app.route("/list/item/decr", methods=["POST"])
@login_required
def decrement_item_count():
    shopping_list_name = request.form["shopping-list"]
    sku = request.form.get("sku")
    store = request.form.get("store")

    # The product query is only needed to populate the name in the in memory shopping list below. It can be removed when that's removed.
    product = model.Product.query.filter_by(sku=sku, store=store).one()
    list_product = model.ShoppingListProduct.query.filter_by(product=product, shopping_list_name=shopping_list_name).one()
    list_product.quantity -= 1
    if list_product.quantity <= 0:
        model.db.session.delete(list_product)
    model.db.session.commit()

    shopping_list = get_shopping_list(shopping_list_name)

    quantity = 0
    if shopping_list.is_editable():
        quantity = shopping_list.decrement_item(product.name)

    return jsonify({"quantity": quantity})

@app.route("/list/item/incr", methods=["POST"])
@login_required
def increment_item_count():
    shopping_list_name = request.form["shopping-list"]
    sku = request.form.get("sku")
    store = request.form.get("store")

    # The product query is only needed to populate the name in the in memory shopping list below. It can be removed when that's removed.
    product = model.Product.query.filter_by(sku=sku, store=store).one()
    list_product = model.ShoppingListProduct.query.filter_by(product=product, shopping_list_name=shopping_list_name).first()
    if list_product:
        list_product.quantity += 1
    else:
        model.db.session.add(model.ShoppingListProduct(product=product, shopping_list_name=shopping_list_name, quantity=1))
    model.db.session.commit()

    shopping_list = get_shopping_list(shopping_list_name)

    quantity = 0
    if shopping_list.is_editable():
        quantity = shopping_list.increment_item(product.name)

    return jsonify({"quantity": quantity})

@app.route("/admin")
@login_required
@roles_required("admin")
def admin_console_home():
    pass

def _get_list_info_raw(archived=None):
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

@app.route("/admin/lists/get")
@login_required
@roles_required("admin")
def get_list_info():
    return jsonify({"lists": _get_list_info_raw(None)})

@app.route("/admin/lists/get/archived")
@login_required
@roles_required("admin")
def get_archived_list_info():
    return jsonify({"lists": _get_list_info_raw(True)})

@app.route("/admin/lists/get/active")
@login_required
@roles_required("admin")
def get_active_list_info():
    return jsonify({"lists": _get_list_info_raw(False)})

@app.route("/admin/lists/create", methods=["POST"])
@login_required
@roles_required("admin")
def create_new_list():
    name = request.form["name"]
    departure_seconds = int(request.form["departureSeconds"])
    
    if model.ShoppingList.query.filter_by(name=name).first():
        return jsonify({"error": {"message": f"The list \"{name}\" already exists.", "field": "name"}}), 409

    if name not in _SHOPPING_LISTS:
        _SHOPPING_LISTS[name] = {}

    if current_user.id not in _SHOPPING_LISTS[name]:
        _SHOPPING_LISTS[name][current_user.id] = shoppinglist.PersistentShoppingList.get(name, departure_seconds)
        if not _SHOPPING_LISTS[name][current_user.id]:
            _SHOPPING_LISTS[name][current_user.id]= shoppinglist.PersistentShoppingList.create(name, departure_seconds)

        model.db.session.add(model.ShoppingList(name=name, rtmid=_SHOPPING_LISTS[name][current_user.id]._id, departure=departure_seconds))
        model.db.session.commit()

    return jsonify({"lists": _get_list_info_raw(False)})

@app.route("/admin/lists/delete", methods=["DELETE"])
@login_required
@roles_required("admin")
def delete_list():
    shopping_list_name = request.form["shopping_list"]

    # Delete from database
    model.db.session.delete(model.ShoppingList.query.filter_by(name=shopping_list_name).one())
    model.db.session.commit()

    # Delete from RtM
    shopping_list = get_shopping_list(shopping_list_name)
    shopping_list.delete()

    # Remove from memory
    delete_shopping_list(shopping_list.name)

    next_list = model.ShoppingList.next()
    return jsonify({"lists": _get_list_info_raw(), "load": next_list.name if next_list else None})

@app.route("/admin/lists/archive", methods=["POST"])
@login_required
@roles_required("admin")
def archive_list():
    shopping_list_name = request.form["shopping_list"]

    model.ShoppingList.active().filter_by(name=shopping_list_name).one().isarchived = True
    model.db.session.commit()

    next_list = model.ShoppingList.next()
    return jsonify({"lists": _get_list_info_raw(False), "load": next_list.name if next_list else None})

@app.route("/admin/lists/unarchive", methods=["POST"])
@login_required
@roles_required("admin")
def unarchive_list():
    shopping_list_name = request.form["shopping_list"]

    model.ShoppingList.archived().filter_by(name=shopping_list_name).one().isarchived = False
    model.db.session.commit()

    return jsonify({"lists": _get_list_info_raw(True)})

@app.route("/admin/lists/departure", methods=["POST"])
@login_required
@roles_required("admin")
def update_departure():
    shopping_list_name = request.form["shopping_list"]
    departure_seconds = int(request.form["departureSeconds"])

    model.ShoppingList.active().filter_by(name=shopping_list_name).one().departure = departure_seconds
    model.db.session.commit()

    return jsonify({"departureSeconds": departure_seconds})

@app.route("/admin/lists/name", methods=["POST"])
@login_required
@roles_required("admin")
def update_name():
    shopping_list_name = request.form["shopping_list"]
    new_name = request.form["name"]

    if model.ShoppingList.active().filter_by(name=new_name).first():
        return jsonify({"error": {"message": f"The list \"{new_name}\" already exists.", "field": "name"}}), 409

    # Update name in memory and RtM
    # Doing this first so if we need to hit the database, the old name is still used.
    shopping_list = get_shopping_list(shopping_list_name)
    shopping_list.name = new_name

    # Update name in database
    model.ShoppingList.active().filter_by(name=shopping_list_name).one().name = new_name
    model.db.session.commit()

    return jsonify({"name": new_name})

@app.route("/admin/item/name", methods=["POST"])
@login_required
@roles_required("admin")
def update_item_name():
    sku = request.form["sku"]
    store = request.form["store"]
    name = request.form["name"]

    try:
        product = model.Product.query.filter_by(sku=sku, store=store).one()
        product.name = name
        model.db.session.commit()
    except sqlalchemy.orm.exc.NoResultFound:
        return jsonify({"error": {"message": f"Could not find product to update. SKU: {sku}, store: {store}", "field": "name"}}), 404

    return jsonify({"name": name, "edited": product.name != product.original_name})

@app.route("/admin/item/name/reset", methods=["POST"])
@login_required
@roles_required("admin")
def reset_item_name():
    print(request.form)
    sku = request.form["sku"]
    store = request.form["store"]

    try:
        product = model.Product.query.filter_by(sku=sku, store=store).one()
        product.name = product.original_name
        model.db.session.commit()
    except sqlalchemy.orm.exc.NoResultFound:
        return jsonify({"error": {"message": f"Could not find product to update. SKU: {sku}, store: {store}", "field": "name"}}), 404

    return jsonify({"name": product.name})

def _parse_price(price_str):
    price = float(price_str)
    if price <= 0:
        raise ValueError("Price cannot be negative.")

    return round(price, 2)

@app.route("/admin/item/price", methods=["POST"])
@login_required
@roles_required("admin")
def update_item_price():
    sku = request.form["sku"]
    store = request.form["store"]
    price_min_str = request.form["price_min"]
    price_max_str = request.form["price_max"]

    errors = []
    try:
        price_min = _parse_price(price_min_str)
    except ValueError:
        errors.append({"message": f"{price_min_str} is not a valid price.", "field": "min"})

    try:
        price_max = _parse_price(price_max_str)
    except ValueError:
        errors.append({"message": f"{price_max_str} is not a valid price.", "field": "max"})

    if errors:
        return jsonify({"errors": errors}), 409

    if price_max < price_min:
        return jsonify({"errors": [{"message": f"Max price must be greater than min price, but {price_max} < {price_min}.", "field": "max"}]}), 409

    try:
        product = model.Product.query.filter_by(sku=sku, store=store).one()
        product.price = {"min": price_min, "max": price_max}
        model.db.session.commit()
    except sqlalchemy.orm.exc.NoResultFound:
        return jsonify({"error": {"message": f"Could not find product to update. SKU: {sku}, store: {store}", "field": "name"}}), 404

    return jsonify({"price": product.price, "edited": product.price != product.original_price})

@app.route("/admin/item/price/reset", methods=["POST"])
@login_required
@roles_required("admin")
def reset_item_price():
    sku = request.form["sku"]
    store = request.form["store"]

    try:
        product = model.Product.query.filter_by(sku=sku, store=store).one()
        product.price = product.original_price
        model.db.session.commit()
    except sqlalchemy.orm.exc.NoResultFound:
        return jsonify({"error": {"message": f"Could not find product to update. SKU: {sku}, store: {store}", "field": "name"}}), 404

    return jsonify({"price": product.price})
