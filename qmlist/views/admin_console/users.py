from flask import jsonify, request
from flask_security import login_required, roles_required

from qmlist import model
from qmlist.qmlist import app
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
    name = request.form["name"]
    email = request.form["email"]

    model.db.session.add(model.User(name=name, email=email))
    model.db.session.commit()

    return jsonify({"users": utils.get_users_info()})

@app.route("/admin/users/delete", methods=["DELETE"])
@login_required
@roles_required("admin")
def delete_user():
    email = request.form["email"]

    model.db.session.delete(model.User.query.filter_by(email=email).one())
    model.db.session.commit()

    return jsonify({"users": utils.get_users_info()})