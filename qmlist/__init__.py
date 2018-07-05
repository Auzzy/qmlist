import os
import sqlite3

from qmlist import model, views

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

# model.db.create_all() 
# load_inventory()