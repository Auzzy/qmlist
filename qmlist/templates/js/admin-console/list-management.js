var LIST_DATEPICKER_FORMAT = "ddd DD-MMM-YYYY HH:mm";

function adminConsoleEditListName(rootElementId, listName) {
    var nameArea = $(`#${rootElementId} li[data-shopping-list='${listName}']`).children().first();
    nameArea.empty()
        .append($("<input></input>")
            .attr("type", "text")
            .css("float", "left")
            .val(listName))
        .append(faButton("fa", "fa-check-square", {"size": "lg", "color": "limegreen", "margin-left": "5px", "float": "left"})
            .click(function() {
                $.post("{{ url_for('update_name') }}", {shopping_list: listName, name: $(this).prev().val()})
                    .done(function(data) {
                        $(`#${rootElementId} li[data-shopping-list='${listName}']`)
                            .attr("data-shopping-list", data["name"]);

                        if ($("#list-tab").attr("data-list-name") === listName) {
                            setListTabName(data["name"]);
                        }
                        adminConsoleDisplayListName(rootElementId, data["name"], false);
                    });
            }))
        .append(faButton("fa", "fa-window-close", {"size": "lg", "color": "red", "margin-left": "5px", "float": "left"})
            .click(function() {
                adminConsoleDisplayListName(rootElementId, listName, false);
            }));
}

function adminConsoleDisplayListName(rootElementId, listName, archiveView) {
    archiveView = archiveView || false;

    var nameArea = $(`#${rootElementId} li[data-shopping-list='${listName}']`).children().first();
    nameArea.empty()
        .append($("<div></div>")
            .css("float", "left")
            .text(listName));
    if (!archiveView) {
        nameArea.append(faButton("fa", "fa-edit", {"color": "darkorange", "margin-left": "5px", "float": "left"})
            .click(function() {
                adminConsoleEditListName(rootElementId, listName);
            }));
    }
}

function adminConsoleDisplayLists(rootElementId, lists, archiveView) {
    archiveView = archiveView || false;

    $(`#${rootElementId}`).empty();
    lists.forEach(list_info => {
        var departureStr = moment.unix(list_info["departure"]).format(LIST_DATEPICKER_FORMAT);

        var shoppingListElement = $("<li></li>")
            .addClass("list-group-item")
            .addClass("d-flex")
            .addClass("justify-content-between")
            .addClass("align-items-center")
            .attr("data-shopping-list", list_info["name"])
            .append($("<div></div>"));

        var columnRight = $("<div></div>");
        if (!archiveView) {
            columnRight.append(faButton("fa", "fa-edit", {"color": "darkorange", "margin-right": "5px", "float": "left"})
                .click(function() {
                    $("#edit-list-datepicker").bootstrapMaterialDatePicker("setDate", departureStr);
                    $("#edit-list-datepicker").attr("data-shopping-list", list_info["name"]);
                    $("#edit-list-datepicker").click();
                }))
        }

        columnRight.append($("<div></div>")
            .css("font-style", "italic")
            .css("float", "left")
            .attr("data-departure", departureStr)
            .text(departureStr));

        if (archiveView) {
            columnRight.append(faButton("fa", "fa-folder-open", {"size": "lg", "color": "blue", "margin-left": "15px", "float": "left"})
                .click(function() {
                    $.post("{{ url_for('unarchive_list') }}", {shopping_list: list_info["name"]})
                        .done(function(data) {
                            adminConsoleDisplayLists(rootElementId, data["lists"], archiveView);
                        });
                }));
        } else {
            columnRight.append(faButton("fa", "fa-folder", {"size": "lg", "color": "blue", "margin-left": "15px", "float": "left"})
                .click(function() {
                    $.post("{{ url_for('archive_list') }}", {shopping_list: list_info["name"]})
                        .done(function(data) {
                            adminConsoleDisplayLists(rootElementId, data["lists"], archiveView);
                            if ($("#list-tab").attr("data-list-name") === list_info["name"]) {
                                loadShoppingListTab(data["load"]);
                            }
                        });
                }));
        }

        columnRight.append(faButton("fa", "fa-trash", {"size": "lg", "color": "red", "margin-left": " 5px", "float": "left"})
            .click(function() {
                bootbox.confirm({
                    message: `Are you sure you want to delete the shopping list "${list_info["name"]}"?`,
                    buttons: {
                        confirm: {label: `Delete "${list_info["name"]}"`, className: 'btn-success'},
                        cancel: {label: 'Cancel', className: 'btn-outline-danger'}
                    },
                    callback: function (result) {
                        if (result) {
                            $.ajax({method: "DELETE", url: "{{ url_for('delete_list') }}", data: {shopping_list: list_info["name"]}})
                                .done(function(data) {
                                    adminConsoleDisplayLists(rootElementId, data["lists"], archiveView);
                                    if ($("#list-tab").attr("data-list-name") === list_info["name"]) {
                                        loadShoppingListTab(data["load"]);
                                    }
                                });
                        }
                    }
                });
            }));

        $(`#${rootElementId}`)
            .append(shoppingListElement
                .append(columnRight));

        adminConsoleDisplayListName(rootElementId, list_info["name"], archiveView);
    });
}

$("#admin-console-lists-tab, #admin-console-tab").on("show.bs.tab", function() {
    $.get("{{ url_for('get_active_list_info') }}")
        .done(function(data) {
            adminConsoleDisplayLists("admin-console-lists-of-lists", data["lists"], false);
        });
});

$("#admin-console-archive-tab").on("show.bs.tab", function() {
    $.get("{{ url_for('get_archived_list_info') }}")
        .done(function(data) {
            adminConsoleDisplayLists("admin-console-archived-lists", data["lists"], true);
        });
});

$("#new-list-button").click(function() {
    $("#create-list-form").css("display", "block");
    $("#create-list-name").val("");
    $("#create-list-datepicker").val("");
});

$("#create-list-cancel").click(function() {
    $("#create-list-form").css("display", "none");
    $("#create-list-name").val("");
    $("#create-list-datepicker").val("");
});

$("#create-list-submit").click(function() {
    var departureSecondsSinceEpoch = moment($("#create-list-datepicker").val(), LIST_DATEPICKER_FORMAT).unix();
    $.post("{{ url_for('create_new_list') }}", {name: $("#create-list-name").val(), departureSeconds: departureSecondsSinceEpoch})
        .done(function(data) {
            adminConsoleDisplayLists("admin-console-lists-of-lists", data["lists"]);
            loadShoppingListTab($("#create-list-name").val());
            $("#create-list-form").css("display", "none");
            $("#create-list-name").val("");
            $("#create-list-datepicker").val("");
        });
});

$("#create-list-datepicker").bootstrapMaterialDatePicker({
    format: LIST_DATEPICKER_FORMAT,
    switchOnClick: true,
    triggerEvent: "focus"
});
$("#edit-list-datepicker").bootstrapMaterialDatePicker({
    format: LIST_DATEPICKER_FORMAT,
    switchOnClick: true,
    triggerEvent: "click"
});

$("#edit-list-datepicker").bootstrapMaterialDatePicker().on("change", function() {
    var shoppingList = $("#edit-list-datepicker").attr("data-shopping-list");
    var departureSecondsSinceEpoch = moment($("#edit-list-datepicker").val(), LIST_DATEPICKER_FORMAT).unix();
    $.post("{{ url_for('update_departure') }}", {shopping_list: shoppingList, departureSeconds: departureSecondsSinceEpoch})
        .done(function(data) {
            var departureStr = moment.unix(data["departureSeconds"]).format(LIST_DATEPICKER_FORMAT);
            $(`[data-shopping-list="${shoppingList}"] [data-departure]`)
                .attr("data-departure", departureStr)
                .text(departureStr);
            $("#edit-list-datepicker").removeAttr("data-shopping-list").val("");
        });
});
$("#edit-list-datepicker").bootstrapMaterialDatePicker().on("close", function() {
    $("#edit-list-datepicker").removeAttr("data-shopping-list").val("");
});

// Since switchOnClick is true, we don't need the OK or Cancel buttons.
$(".dtp .dtp-btn-ok").addClass("hidden");
$(".dtp .dtp-btn-cancel").addClass("hidden");