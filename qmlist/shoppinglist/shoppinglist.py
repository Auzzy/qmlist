import datetime

from qmlist.shoppinglist.rtm import rtmlib


class PersistentShoppingList(object):
    @staticmethod
    def load(name, id, due, tags=[], client=None):
        client = client or rtmlib.connect()
        
        items = [Item.load(rtm_item) for rtm_item in rtmlib.load_list_items(client, id) if rtm_item["tags"] == tags]
        return PersistentShoppingList(id, name, items, due, tags, client)

    def __init__(self, id, name, items, due, tags, client):
        self._id = id
        self.due = due
        self.tags = tags
        self.items = {item.name: item for item in items}
        self.name = name

        self._to_delete = []
        self._to_add = []
        self._client = client or rtmlib.connect()

    def get_item(self, name):
        return self.items.get(name) if name in self.items else ShellItem(name, self)

    def get_items_json(self):
        return [{"name": item.name, "quantity": item.quantity} for item in self.items.values()]

    def save(self):
        for name in list(self.items.keys()):
            item = self.items[name]
            item.save(self._client)
            if item.quantity == 0:
                del self.items[name]

    def is_editable(self):
        return self.due >= datetime.datetime.now()

    '''
    def save(self):
        self._remove_items()
        self._add_items()

    def _add_items(self):
        while self._to_add:
            item = self._add_item(self._to_add.pop())
            self.items.append(item)

    def _add_item(self, item_name):
        item_raw_dict = rtmlib.add_to_list(self._client, self._id, self.due, self.tags, item_name)[0]
        item = Item.load(item_raw_dict)
        self.items.append(item)
        return item

    def _remove_items(self):
        while self._to_delete:
            item = self._remove_item(self._to_delete.pop())
            self.items.remove(item)

    def _remove_item(self, item_name):
        item = self.find_item(item_name, self.due, self.tags)
        rtmlib.remove_from_list(self._client, self._id, item._id, item._task_id)
        return item

    def find_item(self, item_name, due=None, tags=[]):
        for item in self.items:
            if item.name == item_name and (not due or item.due == due) and (not tags or item.tags == tags):
                return item
        return None

    def get_items_json(self):
        return ([{"name": item.name} for item in self.items if item.name not in self._to_delete]
            + [{"name": item_name} for item_name in self._to_add])
    '''

class _ItemBase(object):
    def __init__(self, name, due, tags, quantity=0):
        self.name = name
        self.due = due
        self.tags = tags
        self._quantity = quantity
        self._orig_quantity = quantity

    def inc(self):
        self._quantity += 1
        return self._quantity

    def dec(self):
        self._quantity = (self._quantity - 1) if self._quantity >= 1 else 0
        return self._quantity

    @property
    def quantity(self):
        return self._quantity

    @property
    def list_entry(self):
        return " -- ".join([self.name, str(self.quantity)])

    @property
    def changed(self):
        return self.quantity != self._orig_quantity

class Item(_ItemBase):
    @staticmethod
    def load(item_dict):
        item_name = item_dict["name"]
        name, quantity = item_name.rsplit(" -- ", 1)
        return Item(
            item_dict["id"],
            item_dict["task_id"],
            item_dict["list_id"],
            name,
            item_dict["due"],
            item_dict["tags"],
            item_dict["notes"],
            item_dict["completed_datetime"],
            item_dict["priority"],
            int(quantity))

    def create(id, task_id, list_id, name, due, tags=[], notes=None, completed_datetime=None, priority=None, quantity=0):
        return Item(id, task_id, list_id, name, due, priority, completed_datetime, notes, tags, quantity)

    def __init__(self, id, task_id, list_id, name, due, tags, notes, completed_datetime, priority, quantity):
        super().__init__(name, due, tags, quantity)
        
        self._id = id
        self._task_id = task_id
        self._list_id = list_id

        self.priority = priority
        self.completed_datetime = completed_datetime
        self.notes = notes

    def delete(self, client):
        rtmlib.remove_from_list(client, self._list_id, self._id, self._task_id)

    def save(self, client):
        if self.quantity == 0:
            self.delete(client)
        elif self.changed:
            rtmlib.rename_item(client, self._list_id, self._id, self._task_id, self.list_entry)


class NewItem(_ItemBase):
    def __init__(self, list_id, name, due, tags, quantity=0):
        super().__init__(name, due, tags, quantity)

        self._list_id = list_id

    def save(self, client):
        if self.quantity != 0:
            rtmlib.add_to_list(client, self._list_id, self.due, self.tags, self.list_entry)[0]


class ShellItem(object):
    def __init__(self, name, shopping_list):
        self.name = name
        self.shopping_list = shopping_list
        self.__new_item = None

    def inc(self):
        if not self.__new_item:
            self.__new_item = NewItem(self.shopping_list._id, self.name, self.shopping_list.due, self.shopping_list.tags)
            self.shopping_list.items[self.name] = self.__new_item
        return self.__new_item.inc()

    def dec(self):
        return self.__new_item.dec() if self.__new_item else 0

    @property
    def quantity(self):
        return self.__new_item.quantity if self.__new_item else 0