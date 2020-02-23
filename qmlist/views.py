import datetime
import itertools
import os
from operator import attrgetter, itemgetter

from flask import jsonify, render_template, request
from flask_login import logout_user
from flask_security import current_user, login_required
from sqlalchemy import func

from qmlist import model, qmlist
from qmlist.qmlist import app
from qmlist.shoppinglist import shoppinglist


ITEM_PAGE_SIZE = 100
_SHOPPING_LISTS = {}
ALL_CATEGORY = "All"

def get_shopping_list(name):
    global _SHOPPING_LISTS

    if name not in _SHOPPING_LISTS:
        _SHOPPING_LISTS[name] = {}

    if current_user.id not in _SHOPPING_LISTS[name]:
        shopping_list_db = model.ShoppingList.query.filter_by(name=name).one()
        _SHOPPING_LISTS[name][current_user.id] = shoppinglist.PersistentShoppingList.load(
            name, shopping_list_db.rtmid, shopping_list_db.departure, [current_user.department.tag])
    return _SHOPPING_LISTS[name][current_user.id]

@app.route("/")
@login_required
def home():
    shopping_list_names = [shopping_list.name for shopping_list in model.ShoppingList.query.order_by(model.ShoppingList.departure).all()]
    default_list_name = model.ShoppingList.next().name
    return render_template('index.html', default_list_name=default_list_name, shopping_list_names=shopping_list_names)

@app.route("/search")
@login_required
def search():
    shopping_list_name = request.args["shopping-list"]
    search_term = request.args["search"]
    pageno = int(request.args["pageno"])

    shopping_list = get_shopping_list(shopping_list_name)

    all_results = model.Product.query.filter(func.lower(model.Product.name).contains(search_term.lower()))
    page_results = (all_results
            .order_by(model.Product.name)
            .offset((pageno - 1) * ITEM_PAGE_SIZE)
            .limit(ITEM_PAGE_SIZE)
            .all())

    page_result_dicts = [{"name": product.name, "quantity": shopping_list.get_item(product.name).quantity} for product in page_results]
    return jsonify({"search-results": page_result_dicts, "search-term": search_term, "total-results": all_results.count()})

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
    shopping_list_name = request.args["shopping-list"]
    store_name = request.args["store-name"]
    category_name = request.args.get("category", ALL_CATEGORY)
    page = int(request.args["pageno"])
    item_count = int(request.args["item-count"])

    shopping_list = get_shopping_list(shopping_list_name)

    store_products_query = model.Product.query.filter_by(store=store_name)
    if category_name != ALL_CATEGORY:
        current_category = model.Categories.query.filter_by(store=store_name, name=category_name).one()

        subcategory_ids = [subcategory.id for subcategory in _get_subcategories(current_category)]
        store_products_query = store_products_query.filter(model.Product.categoryid.in_(subcategory_ids))

    store_products_paginator = store_products_query.order_by(model.Product.name).paginate(page, item_count, False)

    store_items_json = []
    for product in store_products_paginator.items:
        item = shopping_list.get_item(product.name)
        price_dict = {"max": float(product.price_max), "min": float(product.price_min)}
        store_items_json.append({"name": item.name, "quantity": item.quantity, "price": price_dict})

    page_json = {"last": store_products_paginator.pages, "current": store_products_paginator.page}
    if store_products_paginator.has_next:
        page_json["next"] = page + 1
    if store_products_paginator.has_prev:
        page_json["prev"] = page - 1

    return jsonify({"store-items": store_items_json, "store": store_name, "category": category_name, "page": page_json})

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
    item_name = request.form.get("item-name")

    shopping_list = get_shopping_list(shopping_list_name)

    quantity = 0
    if shopping_list.is_editable():
        quantity = shopping_list.decrement_item(item_name)

    return jsonify({"quantity": quantity})

@app.route("/list/item/incr", methods=["POST"])
@login_required
def increment_item_count():
    shopping_list_name = request.form["shopping-list"]
    item_name = request.form.get("item-name")

    shopping_list = get_shopping_list(shopping_list_name)

    quantity = 0
    if shopping_list.is_editable():
        quantity = shopping_list.increment_item(item_name)

    return jsonify({"quantity": quantity})