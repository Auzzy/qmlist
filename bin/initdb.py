import argparse
import datetime
import json
import os

from qmlist import model, qmlist, views
from qmlist.rtm import rtmlib


def create_roles():
    model.db.session.add(model.Role(name="user", description="A regular user. This is the default role."))
    model.db.session.add(model.Role(name="admin", description="User with access to change the system."))
    model.db.session.add(model.Role(name="root", description="Immutable user. Has absolute power."))

    model.db.session.commit()

def create_departments():
    model.db.session.add(model.Department(name="Test"))
    model.db.session.add(model.Department(name="HQ"))

    model.db.session.commit()

def create_users():
    user_role = model.Role.query.filter_by(name="user").one()

    user1 = qmlist.user_datastore.create_user(email='foo@netscape.net', password='password')
    user1.departmentid = model.Department.query.filter_by(name="Test").one().id
    user1.roles.append(user_role)

    user2 = qmlist.user_datastore.create_user(email='bar@netscape.net', password='password')
    user2.departmentid = model.Department.query.filter_by(name="HQ").one().id
    user2.roles.append(user_role)

    admin = qmlist.user_datastore.create_user(email=os.environ["ADMIN_USER"], password=os.environ["ADMIN_PASSWORD"])
    admin.roles.extend(model.Role.query.filter(model.Role.name.in_(["admin", "root"])).all())

    model.db.session.commit()

def _load_categories(category_paths, store_name):
    categories = []
    for category_path in category_paths:
        parent = None
        for category_name in category_path:
            category = model.Categories.query.filter_by(name=category_name).one_or_none()
            if not category:
                category = model.Categories(name=category_name, store=store_name, parent=parent)
                model.db.session.add(category)
            parent = category
        categories.append(category)
    return categories

def _load_store_inventory(inventory_filepath, store_name):
    with open(inventory_filepath) as inventory_file:
        inventory = json.load(inventory_file)

    for item in inventory["inventory"]:
        categories = _load_categories(item["categories"], store_name)
        category = categories[0] if categories else None
        matching_product = model.Product.active().filter_by(sku=item["sku"], store=store_name).first()
        if matching_product \
                and item["name"] == matching_product.name \
                and category == matching_product.category \
                and item["price"]["min"] == float(matching_product.price_min) \
                and item["price"]["max"] == float(matching_product.price_max):
            continue

        model.db.session.add(model.Product(
            sku=item["sku"],
            name=item["name"],
            category=category,
            store=store_name,
            price_min=item["price"]["min"],
            price_max=item["price"]["max"]))

def load_inventory(bjs_inventory_filepath, rd_inventory_filepath):
    _load_store_inventory(bjs_inventory_filepath, "BJs")
    _load_store_inventory(rd_inventory_filepath, "Restaurant Depot")

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("bjs_inventory_filepath")
    parser.add_argument("rd_inventory_filepath")

    return vars(parser.parse_args())

if __name__ == "__main__":
    args = parse_args()

    model.db.create_all()

    load_inventory(args["bjs_inventory_filepath"], args["rd_inventory_filepath"])

    create_roles()
    create_departments()
    create_users()
