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
    name = db.Column(db.String(255))
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
    name = db.Column(db.String(255), primary_key=True)
    departure = db.Column(db.BigInteger)
    rtmid = db.Column(db.Integer)
    isarchived = db.Column(db.Boolean, default=False)

    products = db.relationship("Product", secondary="shopping_list_product", lazy="dynamic")

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
        return ShoppingList.active().filter(ShoppingList.departure >= datetime.datetime.now().timestamp()).all()

class Categories(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255))
    store = db.Column(db.String(255))
    parentid = db.Column(db.Integer, db.ForeignKey("categories.id"))
    children = db.relationship('Categories', backref=db.backref('parent', remote_side=id), lazy="dynamic")
    products = db.relationship('Product', backref='category', lazy=True)
    isenabled = db.Column(db.Boolean, default=True)

    @staticmethod
    def enabled():
        return Categories.query.filter_by(isenabled=True)

    @staticmethod
    def disabled():
        return Categories.query.filter_by(isenabled=False)

class Product(db.Model):
    sku = db.Column(db.String(32), primary_key=True)
    store = db.Column(db.String(255), primary_key=True)
    name = db.Column(db.String(255))
    categoryid = db.Column(db.Integer, db.ForeignKey("categories.id"))
    url = db.Column(db.String(255))
    isactive = db.Column(db.Boolean, default=True)
    price_min = db.Column(db.Numeric(asdecimal=False))
    price_max = db.Column(db.Numeric(asdecimal=False))

    original_name = db.Column(db.String(255))
    original_price_min = db.Column(db.Numeric(asdecimal=False))
    original_price_max = db.Column(db.Numeric(asdecimal=False))

    def __init__(self, *args, **kwargs):
        if "name" in kwargs:
            kwargs["original_name"] = kwargs["name"]
        if "price_min" in kwargs:
            kwargs["original_price_min"] = kwargs["price_min"]
        if "price_max" in kwargs:
            kwargs["original_price_max"] = kwargs["price_max"]

        super().__init__(*args, **kwargs)

    @staticmethod
    def active():
        return Product.query.filter_by(isactive=True)

    @staticmethod
    def inactive():
        return Product.query.filter_by(isactive=False)

    @property
    def original_price(self):
        return {"min": self.original_price_min, "max": self.original_price_max}

    @property
    def price(self):
        return {"min": self.price_min, "max": self.price_max}

    @price.setter
    def price(self, value):
        if not isinstance(value, (dict, str, int, float)):
            raise ValueError(f"Got unexpected type for price: {type(value)}.")

        if isinstance(value, dict):
            if "max" not in value.keys() or "min" not in value.keys():
                raise ValueError("Expected min and max price.")

            self.price_min = value["min"]
            self.price_max = value["max"]
        else:
            self.price_min = value
            self.price_max = value

class ShoppingListProduct(db.Model):
    shopping_list_name = db.Column(db.String(255), db.ForeignKey('shopping_list.name'), primary_key=True)
    sku = db.Column(db.String(32), primary_key=True)
    store = db.Column(db.String(255), primary_key=True)
    quantity = db.Column(db.Integer(), nullable=False)
    product = db.relationship('Product', backref=db.backref('demand', lazy='dynamic'))
    shopping_list = db.relationship('ShoppingList', backref=db.backref('inventory', lazy='dynamic', cascade="all, delete-orphan"))

    __table_args__ = (db.ForeignKeyConstraint(['sku', 'store'], ['product.sku', 'product.store']),)


qmlist.user_datastore = SQLAlchemyUserDatastore(db, User, Role)
qmlist.security.init_app(qmlist.app, datastore=qmlist.user_datastore)