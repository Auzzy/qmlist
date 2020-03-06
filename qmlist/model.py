import datetime
import operator

from flask_security import SQLAlchemyUserDatastore, UserMixin, RoleMixin
from flask_sqlalchemy import SQLAlchemy

from qmlist import qmlist
from qmlist.qmlist import db


roles_users = db.Table('roles_users',
        db.Column('user_id', db.Integer(), db.ForeignKey('user.id')),
        db.Column('role_id', db.Integer(), db.ForeignKey('role.id')))

class Role(db.Model, RoleMixin):
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(80), unique=True)
    description = db.Column(db.String(255))

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True)
    password = db.Column(db.String(255))
    active = db.Column(db.Boolean())
    confirmed_at = db.Column(db.DateTime())
    roles = db.relationship('Role', secondary=roles_users,
                            backref=db.backref('users', lazy='dynamic'))
    departmentid = db.Column(db.Integer, db.ForeignKey("department.id"))

class Department(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255))
    tag = db.Column(db.String(255))
    users = db.relationship("User", backref="department", lazy=True)

class ShoppingList(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True)
    departure = db.Column(db.DateTime)
    rtmid = db.Column(db.Integer)
    isarchived = db.Column(db.Boolean, default=False)

    @staticmethod
    def archived():
        return ShoppingList.query.filter_by(isarchived=True)

    @staticmethod
    def active():
        return ShoppingList.query.filter_by(isarchived=False)

    @staticmethod
    def next():
        lists_after_now = ShoppingList.future()
        next_list = min(lists_after_now, key=operator.attrgetter("departure")) if lists_after_now else None
        if not next_list:
            all_lists = ShoppingList.active().all()
            next_list = max(all_lists, key=operator.attrgetter("departure")) if all_lists else None
        return next_list

    @staticmethod
    def future():
        return ShoppingList.active().filter(ShoppingList.departure >= datetime.datetime.now()).all()

class Categories(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255))
    store = db.Column(db.String(255))
    parentid = db.Column(db.Integer, db.ForeignKey("categories.id"))
    children = db.relationship('Categories', backref=db.backref('parent', remote_side=id), lazy="dynamic")
    products = db.relationship('Product', backref='category', lazy=True)

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255))
    categoryid = db.Column(db.Integer, db.ForeignKey("categories.id"))
    url = db.Column(db.String(255))
    store = db.Column(db.String(255))
    stocked = db.Column(db.String(255))
    price_min = db.Column(db.Numeric())
    price_max = db.Column(db.Numeric())


qmlist.user_datastore = SQLAlchemyUserDatastore(db, User, Role)
qmlist.security.init_app(qmlist.app, datastore=qmlist.user_datastore)