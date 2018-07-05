import os
import sqlite3

from qmlist import model, qmlist, views
from qmlist.shoppinglist import shoppinglist


def create_departments():
    model.db.session.add(model.Department(name="Test", tag="foo"))
    model.db.session.add(model.Department(name="HQ", tag="hq"))

    model.db.session.commit()

def create_users():
    user1 = qmlist.user_datastore.create_user(email='foo@netscape.net', password='password')
    user1.departmentid = model.Department.query.filter_by(name="Test").one().id

    user2 = qmlist.user_datastore.create_user(email='bar@netscape.net', password='password')
    user2.departmentid = model.Department.query.filter_by(name="HQ").one().id

    model.db.session.commit()

def load_shopping_lists():
    next_lists = shoppinglist.load_next_lists()
    for list in next_lists:
        if not model.ShoppingList.query.filter_by(rtmid=list["id"]).first():
            model.db.session.add(model.ShoppingList(name=list["name"], rtmid=list["id"], departure=list["departure"]))

    model.db.session.commit()

def load_inventory():
    conn = sqlite3.connect(os.getenv("INVENTORY_DB_PATH"))
    cursor = conn.cursor()

    column_names = ["id", "name", "store", "parentid"]
    cursor.execute("SELECT {} FROM categories".format(', '.join(column_names)))
    all_categories = cursor.fetchall()
    category_name_length = model.Categories.name.property.columns[0].type.length
    for category in all_categories:
        category_dict = dict(zip(column_names, category))
        category_dict["name"] = category_dict["name"][:category_name_length]
        model.db.session.add(model.Categories(**category_dict))

    column_names = ["name", "categoryid", "url", "store", "stocked"]
    cursor.execute("SELECT {} FROM products".format(", ".join(column_names)))
    all_products = cursor.fetchall()
    product_name_length = model.Product.name.property.columns[0].type.length
    for product in all_products:
        product_dict = dict(zip(column_names, product))
        product_dict["name"] = product_dict["name"][:product_name_length]
        model.db.session.add(model.Product(**product_dict))
    model.db.session.commit()

if __name__ == "__main__":
    model.db.create_all()
    load_inventory()

    create_departments()
    create_users()
    load_shopping_lists()