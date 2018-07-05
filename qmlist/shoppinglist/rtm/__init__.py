import rtmapi

# Workaround for getList() returning an non-iterable object: https://bitbucket.org/rtmapi/rtmapi/issues/5/apirtmlistsgetlist-returns-an-object
rtmapi.RtmBase.LISTS.update({
    "lists": "list"
})