from flask import jsonify, request
from flask_security import login_required, roles_required

from qmlist import model
from qmlist.qmlist import app
from qmlist.views import utils

@app.route("/admin/departments/get")
@login_required
@roles_required("admin")
def get_department_info():
    return jsonify({"departments": utils.get_departments_info()})

@app.route("/admin/departments/create", methods=["POST"])
@login_required
@roles_required("admin")
def create_new_department():
    name = request.form["name"]
    user_emails = request.form.getlist("users[]")
    shopping_lists = request.form.getlist("lists[]")

    if model.Department.query.filter_by(name=name).first():
        return jsonify({"error": {"message": f"A department with the name \"{name}\" already exists.", "field": "name"}}), 409

    model.db.session.add(model.Department(
        name=name,
        users=model.User.query.filter(model.User.email.in_(user_emails)).all(),
        lists=model.ShoppingList.query.filter(model.ShoppingList.name.in_(shopping_lists)).all()
    ))
    model.db.session.commit()

    return jsonify({"departments": utils.get_departments_info()})

@app.route("/admin/departments/edit", methods=["POST"])
@login_required
@roles_required("admin")
def edit_department():
    id = request.form["id"]
    name = request.form.get("name")
    user_emails = request.form.getlist("users[]")
    shopping_lists = request.form.getlist("lists[]")

    department = model.Department.query.filter_by(id=id).first()
    if not department:
        return jsonify({"error": {"message": f"Could not find the department requested."}}), 409

    department.name = name
    department.users = model.User.query.filter(model.User.email.in_(user_emails)).all()
    department.lists = model.ShoppingList.active().filter(model.ShoppingList.name.in_(shopping_lists)).all()
    model.db.session.commit()

    return jsonify({"departments": utils.get_departments_info()})

@app.route("/admin/departments/delete", methods=["DELETE"])
@login_required
@roles_required("admin")
def delete_department():
    id = request.form["id"]

    model.db.session.delete(model.Department.query.filter_by(id=id).one())
    model.db.session.commit()

    return jsonify({"departments": utils.get_departments_info()})