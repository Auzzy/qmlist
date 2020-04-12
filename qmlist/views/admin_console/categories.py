from flask import jsonify, request
from flask_security import login_required, roles_required

from qmlist import model
from qmlist.qmlist import app
from qmlist.views import utils

@app.route("/admin/categories/load")
@login_required
@roles_required("admin")
def load_subcategories():
    store_name = request.args["store"]
    category_name = request.args.get("category")

    if category_name:
        subcategories = model.Categories.query.filter_by(store=store_name, name=category_name).one().children
    else:
        subcategories = model.Categories.query.filter_by(store=store_name, parent=None).all()

    subcategory_info = []
    for subcategory in subcategories:
        subcategory_info.append({
            "name": subcategory.name,
            "enabled": subcategory.isenabled,
            "hasChildren": bool(subcategory.children.count())
        })

    return jsonify({"subcategories": subcategory_info})

@app.route("/admin/categories/enable", methods=["POST"])
@login_required
@roles_required("admin")
def category_enable():
    store_name = request.form["store"]
    category_name = request.form["category"]
    propagate = request.form.get("propagate") == "true"

    category = model.Categories.query.filter_by(store=store_name, name=category_name).one()
    if not category.parent or category.parent.isenabled:
        if propagate:
            utils.set_category_tree_enabled(category, True)
        else:
            category.isenabled = True
        model.db.session.commit()

    return jsonify({})

@app.route("/admin/categories/disable", methods=["POST"])
@login_required
@roles_required("admin")
def category_disable():
    store_name = request.form["store"]
    category_name = request.form["category"]

    category = model.Categories.query.filter_by(store=store_name, name=category_name).one()
    utils.set_category_tree_enabled(category, False)
    model.db.session.commit()

    return jsonify({})