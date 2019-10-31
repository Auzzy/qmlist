import datetime

from qmlist.shoppinglist.rtm import rtmlib


class PersistentShoppingList(object):
    @staticmethod
    def load(name, id, departure, tags=[], client=None):
        client = client or rtmlib.connect()
        
        items = [Item.load(rtm_item) for rtm_item in rtmlib.load_list_items(client, id) if rtm_item["tags"] == tags]
        return PersistentShoppingList(id, name, items, departure, tags, client)

    def __init__(self, id, name, items, departure, tags, client):
        self._id = id
        self.departure = departure
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
            self.items[name] = self.items[name].save(self._client)
            if self.items[name].quantity == 0:
                del self.items[name]

    def is_editable(self):
        return self.departure >= datetime.datetime.now()

class _ItemBase(object):
    def __init__(self, name, tags, quantity=0):
        self.name = name
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
            item_dict["tags"],
            item_dict["notes"],
            item_dict["completed_datetime"],
            item_dict["priority"],
            int(quantity))

    def create(id, task_id, list_id, name, tags=[], notes=None, completed_datetime=None, priority=None, quantity=0):
        return Item(id, task_id, list_id, name, priority, completed_datetime, notes, tags, quantity)

    def __init__(self, id, task_id, list_id, name, tags, notes, completed_datetime, priority, quantity):
        super().__init__(name, tags, quantity)
        
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
        return self


class NewItem(_ItemBase):
    def __init__(self, list_id, name, tags, quantity=0):
        super().__init__(name, tags, quantity)

        self._list_id = list_id

    def save(self, client):
        if self.quantity != 0:
            item_entry = rtmlib.add_to_list(client, self._list_id, self.list_entry, tags=self.tags)[0]
            return Item.load(item_entry)
        return self


class ShellItem(object):
    def __init__(self, name, shopping_list):
        self.name = name
        self.shopping_list = shopping_list
        self.__new_item = None

    def inc(self):
        if not self.__new_item:
            self.__new_item = NewItem(self.shopping_list._id, self.name, self.shopping_list.tags)
            self.shopping_list.items[self.name] = self.__new_item
        return self.__new_item.inc()

    def dec(self):
        return self.__new_item.dec() if self.__new_item else 0

    @property
    def quantity(self):
        return self.__new_item.quantity if self.__new_item else 0