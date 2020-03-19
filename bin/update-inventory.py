import argparse
import json

from qmlist import model


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

def load_db_by_key():
    db_by_key = {}
    for product in model.Product.active().all():
        product_as_dict = {
            "name": product.name,
            "category": product.category,
            "price_min": float(product.price_min),
            "price_max": float(product.price_max)
        }
        if product.url:
            product_as_dict["url"] = product.url

        db_by_key[(product.sku, product.store)] = product_as_dict
    return db_by_key

def load_inventory_by_key(inventory_filepath, store_name):
    with open(inventory_filepath) as inv_file:
        inv = json.load(inv_file)["inventory"]

    inv_by_key = {}
    for item in inv:
        categories = _load_categories(item["categories"], store_name)
        item["category"] = categories[0] if categories else None
        del item["categories"]

        item["price_min"] = item["price"]["min"]
        item["price_max"] = item["price"]["max"]
        del item["price"]

        inv_by_key[(item["sku"], store_name)] = item

        # Since it's part of the key
        del item["sku"]
    return inv_by_key

def update_inventory(bjs_inventory_filepath, rd_inventory_filepath):
    inv_by_key = load_inventory_by_key(bjs_inventory_filepath, "BJs")
    inv_by_key.update(
        load_inventory_by_key(rd_inventory_filepath, "Restaurant Depot"))

    db_by_key = load_db_by_key()

    inv_keys = set(inv_by_key.keys())
    db_keys = set(db_by_key.keys())

    to_update, to_add, to_remove = db_keys.intersection(inv_keys), inv_keys - db_keys, db_keys - inv_keys

    for pkey in to_update:
        item = inv_by_key[pkey]
        product_dict = db_by_key[pkey]
        if item == product_dict:
            continue

        product = model.Product.active().filter_by(sku=pkey[0], store=pkey[1]).one()
        product.name = item["name"]
        product.category = item["category"]
        product.url = item.get("url")
        product.price_min = item["price_min"]
        product.price_max = item["price_max"]

    for pkey in to_add:
        product = model.Product.inactive().filter_by(sku=pkey[0], store=pkey[1]).first()
        if product:
            product.isactive = True
        else:
            model.db.session.add(model.Product(sku=pkey[0], store=pkey[1], **inv_by_key[pkey]))

    for pkey in to_remove:
        model.Product.active().filter_by(sku=pkey[0], store=pkey[1]).one().isactive = False

    model.db.session.commit()

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("bjs_inventory_filepath")
    parser.add_argument("rd_inventory_filepath")

    return vars(parser.parse_args())

if __name__ == "__main__":
    args = parse_args()

    update_inventory(args["bjs_inventory_filepath"], args["rd_inventory_filepath"])