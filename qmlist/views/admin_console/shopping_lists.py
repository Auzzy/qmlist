from flask import jsonify, request
from flask_security import login_required, roles_required

from qmlist import model
from qmlist.qmlist import app
from qmlist.views import utils

@app.route("/admin/lists/get")
@login_required
@roles_required("admin")
def get_list_info():
    return jsonify({"lists": utils.get_list_info_raw(None)})

@app.route("/admin/lists/get/archived")
@login_required
@roles_required("admin")
def get_archived_list_info():
    return jsonify({"lists": utils.get_list_info_raw(True)})

@app.route("/admin/lists/get/active")
@login_required
@roles_required("admin")
def get_active_list_info():
    return jsonify({"lists": utils.get_list_info_raw(False)})

@app.route("/admin/lists/create", methods=["POST"])
@login_required
@roles_required("admin")
def create_new_list():
    name = request.form["name"]
    departure_seconds = int(request.form["departureSeconds"])
    
    if model.ShoppingList.query.filter_by(name=name).first():
        return jsonify({"error": {"message": f"The list \"{name}\" already exists.", "field": "name"}}), 409

    model.db.session.add(model.ShoppingList(name=name, departure=departure_seconds))
    model.db.session.commit()

    return jsonify({"lists": utils.get_list_info_raw(False)})

@app.route("/admin/lists/delete", methods=["DELETE"])
@login_required
@roles_required("admin")
def delete_list():
    shopping_list_name = request.form["shopping_list"]

    # Delete from database
    model.db.session.delete(model.ShoppingList.query.filter_by(name=shopping_list_name).one())
    model.db.session.commit()

    next_list = model.ShoppingList.next()
    return jsonify({"lists": utils.get_list_info_raw(), "load": next_list.name if next_list else None})

@app.route("/admin/lists/archive", methods=["POST"])
@login_required
@roles_required("admin")
def archive_list():
    shopping_list_name = request.form["shopping_list"]

    model.ShoppingList.active().filter_by(name=shopping_list_name).one().isarchived = True
    model.db.session.commit()

    next_list = model.ShoppingList.next()
    return jsonify({"lists": utils.get_list_info_raw(False), "load": next_list.name if next_list else None})

@app.route("/admin/lists/unarchive", methods=["POST"])
@login_required
@roles_required("admin")
def unarchive_list():
    shopping_list_name = request.form["shopping_list"]

    model.ShoppingList.archived().filter_by(name=shopping_list_name).one().isarchived = False
    model.db.session.commit()

    return jsonify({"lists": utils.get_list_info_raw(True)})

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

    model.ShoppingList.active().filter_by(name=shopping_list_name).one().name = new_name
    model.db.session.commit()

    return jsonify({"name": new_name})

@app.route("/list/export", methods=["POST"])
@login_required
@roles_required("admin")
def export_list():
    shopping_list_name = request.form["shopping_list"]

    utils.export_list_to_rtm(shopping_list_name)

    return jsonify({})