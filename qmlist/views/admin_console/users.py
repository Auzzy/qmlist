from flask import jsonify, request
from flask_security import login_required, roles_required

from qmlist import model
from qmlist.qmlist import app, user_datastore
from qmlist.views import utils

@app.route("/admin/users/get")
@login_required
@roles_required("admin")
def get_user_info():
    return jsonify({"users": utils.get_users_info()})

@app.route("/admin/users/create", methods=["POST"])
@login_required
@roles_required("admin")
def create_new_user():
    email = request.form["email"]
    name = request.form.get("name")
    role = request.form["role"]

    if model.User.query.filter_by(email=email).first():
        return jsonify({"error": {"message": f"A user with the email \"{email}\" already exists.", "field": "email"}}), 409

    role = model.Role.query.filter_by(name=role).one()
    user_datastore.create_user(name=name, email=email, password='password', roles=[role])
    model.db.session.commit()

    return jsonify({"users": utils.get_users_info()})

@app.route("/admin/users/edit", methods=["POST"])
@login_required
@roles_required("admin")
def edit_user():
    email = request.form["email"]
    name = request.form.get("name")
    role = request.form.get("role")

    user = model.User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": {"message": f"No user with the email \"{email}\" found.", "field": "email"}}), 409

    user.name = name
    user.roles = [model.Role.query.filter_by(name=role).one()]
    model.db.session.commit()

    return jsonify({"users": utils.get_users_info()})

@app.route("/admin/users/delete", methods=["DELETE"])
@login_required
@roles_required("admin")
def delete_user():
    email = request.form["email"]

    user = model.User.query.filter_by(email=email).one()
    if user.has_role("root"):
        return jsonify({"error": {"message": f"Cannot delete that user.", "field": "name"}}), 409

    model.db.session.delete(user)
    model.db.session.commit()

    return jsonify({"users": utils.get_users_info()})

@app.route("/admin/users/roles")
@login_required
@roles_required("admin")
def get_roles():
    roles = [role.name for role in model.Role.query.filter(model.Role.name != "root").all()]
    return jsonify({"roles": roles, "default": "user"})