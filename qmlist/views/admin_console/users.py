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

    if model.User.query.filter_by(email=email).first():
        return jsonify({"error": {"message": f"A user with the email \"{email}\" already exists.", "field": "email"}}), 409

    user_datastore.create_user(name=name, email=email, password='password')
    model.db.session.commit()

    return jsonify({"users": utils.get_users_info()})

@app.route("/admin/users/edit", methods=["POST"])
@login_required
@roles_required("admin")
def edit_user():
    email = request.form["email"]
    name = request.form.get("name")

    user = model.User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": {"message": f"No user with the email \"{email}\" found.", "field": "email"}}), 409

    user.name = name
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