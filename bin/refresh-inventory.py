import argparse
import datetime
import multiprocessing
import os
import shutil

import bjsparserlib
import bjsparserlib.inventory
import rdparserlib
import rdparserlib.inventory

REFRESH_AGE = datetime.timedelta(days=7)

def _file_last_modified(filepath):
    return datetime.datetime.fromtimestamp(os.path.getmtime(filepath))

def _inventory_needs_refresh(inventory_filepath):
    if os.path.exists(inventory_filepath):
        last_modified = _file_last_modified(inventory_filepath)
        return datetime.datetime.now() - last_modified >= REFRESH_AGE
    return True

def _inventory_worker(parserlib, inventory_filepath, force):
    temp_inventory_filepath = f".{inventory_filepath}.tmp"
    if force or _inventory_needs_refresh(inventory_filepath):
        parserlib.inventory.download(temp_inventory_filepath)
        shutil.move(temp_inventory_filepath, inventory_filepath)

def refresh_inventory(rd_inventory_filepath, bjs_inventory_filepath, force=False):
    rdproc = multiprocessing.Process(target=_inventory_worker, args=(rdparserlib, rd_inventory_filepath, force))
    rdproc.start()

    bjsproc = multiprocessing.Process(target=_inventory_worker, args=(bjsparserlib, bjs_inventory_filepath, force))
    bjsproc.start()

    rdproc.join()
    bjsproc.join()

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("bjs-inventory")
    parser.add_argument("rd-inventory")
    parser.add_argument("-f", "--force", action="store_true")

    return vars(parser.parse_args())

if __name__ == "__main__":
    args = parse_args()

    refresh_inventory(args["rd-inventory"], args["bjs-inventory"], args["force"])