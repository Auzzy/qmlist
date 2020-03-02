import datetime
import hashlib
import os

import rtmapi
from rtmapi import Rtm


GENERATE_FROB_URL_FORMAT = "https://www.rememberthemilk.com/services/auth/?api_key={key}&perms=delete&api_sig={sig}"

DUE_DATE_FORMAT = "%m/%d/%Y %H:%M"
PARSE_DUE_DATE = str(int("/" in DUE_DATE_FORMAT))

API_DATE_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


def _generate_frob_url(api_key, shared_secret):
    md5 = hashlib.md5()
    md5.update("{secret}api_key{key}permsdelete".format(secret=shared_secret, key=api_key))
    api_sig = md5.hexdigest()
    return GENERATE_FROB_URL_FORMAT.format(key=api_key, sig=api_sig)

def connect(api_key=None, shared_secret=None, token=None, frob=None):
    api_key = api_key or os.environ.get("RTM_KEY")
    shared_secret = shared_secret or os.environ.get("RTM_SECRET")
    token = token or os.environ.get("RTM_TOKEN")

    if not api_key or not shared_secret or not (token or frob):
        raise ValueError("Expected an API key, app secret, and either a token or frob.")
    
    api = Rtm(api_key, shared_secret, "delete", token)

    if frob:
        api.retrieve_token(frob)
        print("New token: ", api.token)
    else:
        # authenication block, see http://www.rememberthemilk.com/services/api/authentication.rtm
        # check for valid token
        if not api.token_valid():
            md5 = hashlib.md5()
            md5.update("{secret}api_key{key}permsdelete".format(secret=shared_secret, key=api_key))
            api_sig = md5.hexdigest()
            generate_frob_url = _generate_frob_url(api_key, shared_secret)
            raise ValueError("An invalid token was provided. Try generating a new frob in the browser by visiting {}".format(generate_frob_url))

    return api


def filter_lists(rtm_client, deleted=None, locked=None, archived=None, smart=None):
    """For each parameter, if True or False are provided, the attribute must match. If None is provided, it's not
    included in the filter.
    """
    rtm_lists = []
    for rtm_list in rtm_client.rtm.lists.getList().lists:
        add = deleted is None or str(int(deleted)) == rtm_list.deleted
        add = add and (locked is None or str(int(locked)) == rtm_list.locked)
        add = add and (archived is None or str(int(archived)) == rtm_list.archived)
        add = add and (smart is None or str(int(smart)) == rtm_list.smart)
        if add:
            rtm_lists.append(rtm_list)

    return rtm_lists

def get_current_lists(rtm_client):
    rtm_lists = []
    for rtm_list in filter_lists(rtm_client, archived=False, deleted=False, smart=False):
        rtm_lists.append({"name": rtm_list.name, "id": rtm_list.id})
    return rtm_lists

def _add_item_to_list(rtm_client, timeline, list_id, item, due_date, tags_str):
    task_result = rtm_client.rtm.tasks.add(timeline=timeline, list_id=list_id, name=item)

    item_id = {
        "timeline": timeline,
        "list_id": list_id,
        "taskseries_id": task_result.list.taskseries.id,
        "task_id": task_result.list.taskseries.task.id
    }

    task_result = rtm_client.rtm.tasks.setTags(tags=tags_str, **item_id)
    if due_date:
        task_result = rtm_client.rtm.tasks.setDueDate(due=due_date.strftime(DUE_DATE_FORMAT), parse=PARSE_DUE_DATE, **item_id)

    return _item_as_dict(task_result.list.taskseries, list_id)

def add_to_list(rtm_client, list_id, *items, due_date=None, tags=[]):
    """due_date should be a date or datetime object
    tags should be a list of strings."""
    tags_str = ",".join([str(tag) for tag in tags])
    timeline = rtm_client.rtm.timelines.create().timeline.value
    return [_add_item_to_list(rtm_client, timeline, str(list_id), item, due_date, tags_str) for item in items]

def rename_item(rtm_client, list_id, taskseries_id, task_id, new_name):
    timeline = rtm_client.rtm.timelines.create().timeline.value
    rtm_client.rtm.tasks.setName(timeline=timeline, list_id=str(list_id), taskseries_id=taskseries_id, task_id=task_id, name=new_name)

def get_list_ids(rtm_client, list_name):
    """If multiple lists are found with the same name, returns all their IDs."""
    return [rtm_list.id for rtm_list in rtm_client.rtm.lists.getList().lists if rtm_list.name == list_name]

def get_list_by_id(rtm_client, id):
    for rtm_list in rtm_client.rtm.lists.getList().lists:
        if rtm_list.id == id:
            return rtm_list
    else:
        raise ValueError("Could not find a list with the given ID: {}".format(id))

def remove_from_list(rtm_client, list_id, taskseries_id, task_id):
    timeline = rtm_client.rtm.timelines.create().timeline.value
    rtm_client.rtm.tasks.delete(timeline=timeline, list_id=str(list_id), taskseries_id=taskseries_id, task_id=task_id)

def create_list(rtm_client, name):
    timeline = rtm_client.rtm.timelines.create().timeline.value
    new_list = rtm_client.rtm.lists.add(timeline=timeline, name=name).list
    return new_list

def get_or_create_list_id(rtm_client, name):
    list_ids = get_list_ids(rtm_client, name)
    if not list_ids:
        return create_list(rtm_client, name).id
    elif len(list_ids) > 1:
        raise Exception("Multiple lists were discovered with the same name. Please choose a different list.")

    return list_ids[0]

def load_list_items(rtm_client, list_id):
    try:
        tasks = rtm_client.rtm.tasks.getList(list_id=str(list_id)).tasks
    except rtmapi.RtmRequestFailedException as exc:
        if exc.args[1] == "320":
            return []

    return [_item_as_dict(taskseries, list_id) for list in tasks for taskseries in list]

def rename_list(rtm_client, list_id, new_name):
    timeline = rtm_client.rtm.timelines.create().timeline.value
    rtm_client.rtm.lists.setName(timeline=timeline, list_id=str(list_id), name=new_name)

def delete_list(rtm_client, list_id):
    timeline = rtm_client.rtm.timelines.create().timeline.value
    rtm_client.rtm.lists.delete(timeline=timeline, list_id=str(list_id))

def _item_as_dict(taskseries, list_id):
    return {
        "id": taskseries.id,
        "task_id": taskseries.task.id,
        "list_id": list_id,
        "name": taskseries.name,
        "created_datetime": _parse_api_datetime(taskseries.created),
        "modified_datetime": _parse_api_datetime(taskseries.modified),
        "tags": [tag.value for tag in taskseries.tags],
        "notes": [note.value for note in taskseries.notes],
        "due": _parse_api_datetime(taskseries.task.due),
        "completed_datetime": _parse_api_datetime(taskseries.task.completed),
        "priority": taskseries.task.priority
    }

def _parse_api_datetime(datetime_str):
    if datetime_str:
        return datetime.datetime.strptime(datetime_str, API_DATE_FORMAT) - datetime.timedelta(hours=5)
    else:
        return None

def _parse_api_date(datetime_str):
    api_datetime = _parse_api_datetime(datetime_str)
    return api_datetime.date() if api_datetime else None