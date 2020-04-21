import datetime
from operator import itemgetter

import sqlalchemy
from flask import jsonify, render_template, request
from flask_login import logout_user
from flask_security import current_user, login_required

from qmlist import model
from qmlist.qmlist import app
from qmlist.views import utils

ALL_CATEGORY = "All"

@app.route("/search")
@login_required
def search():
    shopping_list_name = request.args.get("shopping-list")
    search_term = request.args["search"]
    pageno = int(request.args.get("pageno", 1))
    item_count = int(request.args.get("item-count", 25))

    search_results = model.Product.active().filter(sqlalchemy.func.lower(model.Product.name).contains(search_term.lower()))
    return jsonify(utils.prepare_item_list(search_results, shopping_list_name, pageno, item_count))

@app.route("/browse/stores")
@login_required
def browse_stores():
    store_name = request.args["storeName"]
    category = request.args.get("category", ALL_CATEGORY)

    current_category = model.Categories.enabled().filter_by(store=store_name, name=category).one() if category != ALL_CATEGORY else None
    current_category_path = [ALL_CATEGORY] + [category.name for category in utils.get_category_path(current_category)]

    store_categories_query = utils.get_store_categories_query(current_category, store_name).order_by(model.Categories.name)
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
        current_category = model.Categories.enabled().filter_by(store=store_name, name=category_name).one()

        subcategory_ids = [subcategory.id for subcategory in _get_subcategories(current_category)]
        store_products_query = store_products_query.filter(model.Product.categoryid.in_(subcategory_ids))

    return jsonify(utils.prepare_item_list(store_products_query, shopping_list_name, pageno, item_count))

@app.route("/browse/lists")
@login_required
def list_shopping_lists():
    shopping_lists = []
    raw_shopping_lists = utils.get_list_info_raw(None)
    user_department = current_user.department.name if current_user.department else None
    if not user_department or current_user.has_role("admin"):
        shopping_lists = raw_shopping_lists
    else:
        for list_info in raw_shopping_lists:
            if user_department == list_info["department"]:
                shopping_lists.append(list_info)
    return jsonify({"lists": shopping_lists})

@app.route("/load-list")
@login_required
def load_shopping_list():
    shopping_list_name = request.args["shopping-list"]

    shopping_list = model.ShoppingList.query.filter_by(name=shopping_list_name).one()
    response_json = utils.prepare_item_list(shopping_list.products, shopping_list_name, 1, 1000)
    response_json["editable"] = shopping_list.departure >= datetime.datetime.now().timestamp()
    return jsonify(response_json)

@app.route("/list/item/decr", methods=["POST"])
@login_required
def decrement_item_count():
    shopping_list_name = request.form["shopping-list"]
    sku = request.form.get("sku")
    store = request.form.get("store")

    list_product = model.ShoppingListProduct.query.filter_by(sku=sku, store=store, shopping_list_name=shopping_list_name).one()
    list_product.quantity -= 1
    if list_product.quantity <= 0:
        model.db.session.delete(list_product)
    model.db.session.commit()

    return jsonify({"quantity": list_product.quantity if list_product else 0})

@app.route("/list/item/incr", methods=["POST"])
@login_required
def increment_item_count():
    shopping_list_name = request.form["shopping-list"]
    sku = request.form.get("sku")
    store = request.form.get("store")

    list_product = model.ShoppingListProduct.query.filter_by(sku=sku, store=store, shopping_list_name=shopping_list_name).first()
    if list_product:
        list_product.quantity += 1
    else:
        list_product = model.ShoppingListProduct(sku=sku, store=store, shopping_list_name=shopping_list_name, quantity=1)
        model.db.session.add(list_product)
    model.db.session.commit()

    return jsonify({"quantity": list_product.quantity})