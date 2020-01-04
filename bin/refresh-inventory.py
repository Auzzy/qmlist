import argparse
import datetime
import multiprocessing
import os
import shutil

import bjsparserlib
import bjsparserlib.database
import rdparserlib
import rdparserlib.database

DEFAULT_BJS_INVENTORY = "bjs-inventory.json"
DEFAULT_RD_INVENTORY = "rd-inventory.json"
REFRESH_AGE = datetime.timedelta(days=7)

def _file_last_modified(filepath):
    return datetime.datetime.fromtimestamp(os.path.getmtime(filepath))

def _inventory_needs_refresh(inventory_filepath):
    if os.path.exists(inventory_filepath):
        last_modified = _file_last_modified(inventory_filepath)
        return datetime.datetime.now() - last_modified >= REFRESH_AGE
    return True

def _inventory_worker(parserlib, database_filepath, inventory_filepath, force):
    temp_inventory_filepath = f".{inventory_filepath}.tmp"
    if force or _inventory_needs_refresh(inventory_filepath):
        parserlib.download_and_populate(temp_inventory_filepath, database_filepath)
        shutil.move(temp_inventory_filepath, inventory_filepath)
    else:
        parserlib.database.populate_from_file(inventory_filepath, database_filepath)

def refresh_inventory(database_filepath, rd_inventory_filepath=DEFAULT_RD_INVENTORY, bjs_inventory_filepath=DEFAULT_RD_INVENTORY, force=False):
    temp_database_filepath = f".{database_filepath}.tmp"

    rdproc = multiprocessing.Process(target=_inventory_worker, args=(rdparserlib, temp_database_filepath, rd_inventory_filepath, force))
    rdproc.start()

    bjsproc = multiprocessing.Process(target=_inventory_worker, args=(bjsparserlib, temp_database_filepath, bjs_inventory_filepath, force))
    bjsproc.start()

    rdproc.join()
    bjsproc.join()

    shutil.move(temp_database_filepath, database_filepath)

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("database")
    parser.add_argument("-b", "--bjs-inventory", default=DEFAULT_BJS_INVENTORY)
    parser.add_argument("-r", "--rd-inventory", default=DEFAULT_RD_INVENTORY)
    parser.add_argument("-f", "--force", action="store_true")

    return vars(parser.parse_args())

if __name__ == "__main__":
    args = parse_args()

    refresh_inventory(args["database"], args["rd_inventory"], args["bjs_inventory"], args["force"])