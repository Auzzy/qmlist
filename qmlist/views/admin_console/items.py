import sqlalchemy
from flask import jsonify, request
from flask_security import login_required, roles_required

from qmlist import model
from qmlist.qmlist import app
from qmlist.views import utils

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
    sku = request.form["sku"]
    store = request.form["store"]

    try:
        product = model.Product.query.filter_by(sku=sku, store=store).one()
        product.name = product.original_name
        model.db.session.commit()
    except sqlalchemy.orm.exc.NoResultFound:
        return jsonify({"error": {"message": f"Could not find product to update. SKU: {sku}, store: {store}", "field": "name"}}), 404

    return jsonify({"name": product.name})

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
        price_min = utils.parse_price(price_min_str)
    except ValueError:
        errors.append({"message": f"{price_min_str} is not a valid price.", "field": "min"})

    try:
        price_max = utils.parse_price(price_max_str)
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

