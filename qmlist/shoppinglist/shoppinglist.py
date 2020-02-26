import datetime

from qmlist.shoppinglist.rtm import rtmlib


class PersistentShoppingList(object):
    @staticmethod
    def load(name, id, departure, tags=[], client=None):
        client = client or rtmlib.connect()
        
        items = [Item.load(client, rtm_item) for rtm_item in rtmlib.load_list_items(client, id) if not tags or rtm_item["tags"] == tags]
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
        return self.items.get(name) if name in self.items else NewItem(self._client, self._id, name, self.tags)

    def get_items_json(self):
        return [{"name": item.name, "quantity": item.quantity} for item in self.items.values()]

    def increment_item(self, name):
        item = self.get_item(name)
        self.items[name] = item.inc()
        return self.items[name].quantity

    def decrement_item(self, name):
        item = self.get_item(name)
        self.items[name] = item.dec()
        if self.items[name].quantity == 0:
            del self.items[name]
            return 0
        else:
            return self.items[name].quantity

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
        return self

    def dec(self):
        self._quantity = (self._quantity - 1) if self._quantity >= 1 else 0
        return self

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
    def load(client, item_dict):
        item_name = item_dict["name"]
        name, quantity = item_name.rsplit(" -- ", 1)
        return Item(
            client,
            item_dict["id"],
            item_dict["task_id"],
            item_dict["list_id"],
            name,
            item_dict["tags"],
            item_dict["notes"],
            item_dict["completed_datetime"],
            item_dict["priority"],
            int(quantity))

    def create(client, id, task_id, list_id, name, tags=[], notes=None, completed_datetime=None, priority=None, quantity=0):
        return Item(client, id, task_id, list_id, name, priority, completed_datetime, notes, tags, quantity)

    def __init__(self, client, id, task_id, list_id, name, tags, notes, completed_datetime, priority, quantity):
        super().__init__(name, tags, quantity)

        self._client = client
        self._id = id
        self._task_id = task_id
        self._list_id = list_id

        self.priority = priority
        self.completed_datetime = completed_datetime
        self.notes = notes

    def inc(self):
        super().inc()

        rtmlib.rename_item(self._client, self._list_id, self._id, self._task_id, self.list_entry)
        return self

    def dec(self):
        super().dec()

        if self.quantity == 0:
            self.delete()
        else:
            rtmlib.rename_item(self._client, self._list_id, self._id, self._task_id, self.list_entry)
        return self

    def delete(self):
        rtmlib.remove_from_list(self._client, self._list_id, self._id, self._task_id)

class NewItem(_ItemBase):
    def __init__(self, client, list_id, name, tags, quantity=0):
        super().__init__(name, tags, quantity)

        self._client = client
        self._list_id = list_id

    def inc(self):
        item_entry = rtmlib.add_to_list(self._client, self._list_id, self.list_entry, tags=self.tags)[0]
        new_item = Item.load(self._client, item_entry)
        return new_item.inc()