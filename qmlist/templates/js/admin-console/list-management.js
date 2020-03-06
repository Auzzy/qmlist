function adminConsoleEditListName(listName) {
    var nameArea = $(`#admin-console-lists-of-lists li[data-shopping-list='${listName}']`).children().first();
    nameArea.empty()
        .append($("<input></input>")
            .attr("type", "text")
            .css("float", "left")
            .val(listName))
        .append(faButton("fa", "fa-check-square", {"size": "lg", "color": "limegreen", "margin-left": "5px", "float": "left"})
            .click(function() {
                $.post("{{ url_for('update_name') }}", {shopping_list: listName, name: $(this).prev().val()})
                    .done(function(data) {
                        $(`#admin-console-lists-of-lists li[data-shopping-list='${listName}']`)
                            .attr("data-shopping-list", data["name"]);

                        if ($("#list-tab").attr("data-list-name") === listName) {
                            setListTabName(data["name"]);
                        }
                        adminConsoleDisplayListName(data["name"]);
                    });
            }))
        .append(faButton("fa", "fa-window-close", {"size": "lg", "color": "red", "margin-left": "5px", "float": "left"})
            .click(function() {
                adminConsoleDisplayListName(listName);
            }));
}

function adminConsoleDisplayListName(listName) {
    var nameArea = $(`#admin-console-lists-of-lists li[data-shopping-list='${listName}']`).children().first();
    nameArea.empty()
        .append($("<div></div>")
            .css("float", "left")
            .text(listName))
        .append(faButton("fa", "fa-edit", {"margin-left": "5px", "float": "left"})
            .click(function() {
                adminConsoleEditListName(listName);
            }));
}

function adminConsoleDisplayLists(lists) {
    $("#admin-console-lists-of-lists").empty();
    lists.forEach(list_info => {
        $("#admin-console-lists-of-lists")
            .append($("<li></li>")
                .addClass("list-group-item")
                .addClass("d-flex")
                .addClass("justify-content-between")
                .addClass("align-items-center")
                .attr("data-shopping-list", list_info["name"])
                .append($("<div></div>"))
                .append($("<div></div>")
                    .append(faButton("fa", "fa-edit", {"margin-right": "5px", "float": "left"})
                        .click(function() {
                            $("#edit-list-datepicker").bootstrapMaterialDatePicker("setDate", list_info["departure"]);
                            $("#edit-list-datepicker").attr("data-shopping-list", list_info["name"]);
                            $("#edit-list-datepicker").click();
                        }))
                    .append($("<div></div>")
                        .css("font-style", "italic")
                        .css("float", "left")
                        .text(list_info["departure"]))
                   .append(faButton("fa", "fa-trash", {"size": "lg", "color": "red", "margin-left": "15px", "float": "left"})
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
                                                adminConsoleDisplayLists(data["lists"]);
                                                if ($("#list-tab").attr("data-list-name") === list_info["name"]) {
                                                    console.log(data["load"]);
                                                    loadShoppingListTab(data["load"]);
                                                }
                                            });
                                    }
                                }
                            });
                        }))));

        adminConsoleDisplayListName(list_info["name"]);
    });
}

$("#admin-console-lists-tab, #admin-console-tab").on("show.bs.tab", function() {
    $.get("{{ url_for('get_list_info') }}")
        .done(function(data) {
            adminConsoleDisplayLists(data["lists"]);
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
    $.post("{{ url_for('create_new_list') }}", {name: $("#create-list-name").val(), date: $("#create-list-datepicker").val()})
        .done(function(data) {
            adminConsoleDisplayLists(data["lists"]);
            loadShoppingListTab($("#create-list-name").val());
            $("#create-list-form").css("display", "none");
            $("#create-list-name").val("");
            $("#create-list-datepicker").val("");
        });
});

$("#create-list-datepicker").bootstrapMaterialDatePicker({
    format: 'ddd DD-MMM-YYYY HH:mm',
    switchOnClick: true,
    triggerEvent: "focus"
});
$("#edit-list-datepicker").bootstrapMaterialDatePicker({
    format: 'ddd DD-MMM-YYYY HH:mm',
    switchOnClick: true,
    triggerEvent: "click"
});

$("#edit-list-datepicker").bootstrapMaterialDatePicker().on("change", function() {
    var shoppingList = $("#edit-list-datepicker").attr("data-shopping-list");
    $.post("{{ url_for('update_departure') }}", {shopping_list: shoppingList, departure: $("#edit-list-datepicker").val()})
        .done(function(data) {
            $(`[data-shopping-list="${shoppingList}"] div div`).text(data["departure"]);
            $("#edit-list-datepicker").removeAttr("data-shopping-list").val("");
        });
});
$("#edit-list-datepicker").bootstrapMaterialDatePicker().on("close", function() {
    $("#edit-list-datepicker").removeAttr("data-shopping-list").val("");
});

// Since switchOnClick is true, we don't need the OK or Cancel buttons.
$(".dtp .dtp-btn-ok").addClass("hidden");
$(".dtp .dtp-btn-cancel").addClass("hidden");