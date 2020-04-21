var LIST_DATEPICKER_FORMAT = "ddd DD-MMM-YYYY HH:mm";

function adminConsoleListControl(archiveView) {
    var controlArea = $("<div></div>")
        .css("float", "left");

    if (archiveView) {
        controlArea.append(faButton("fa", "fa-folder-open", {"size": "lg", "color": "blue", "margin-left": "15px", "float": "left"})
            .click(function() {
                var root = $(this).parents("li");
                var listName = root.attr("data-shopping-list");
                $.post("{{ url_for('unarchive_list') }}", {shopping_list: listName})
                    .done(function(data) {
                        root.remove();
                    });
            }));
    } else {
        controlArea
            .append(faButton("fa", "fa-cart-arrow-down", {"size": "lg", "color": "green", "margin-left": "15px", "float": "left"})
                .click(function() {
                    var root = $(this).parents("li");
                    var listName = root.attr("data-shopping-list");
                    $.post("{{ url_for('export_list') }}", {shopping_list: listName});
                }))
            .append(faButton("fa", "fa-folder", {"size": "lg", "color": "blue", "margin-left": "15px", "float": "left"})
                .click(function() {
                    var root = $(this).parents("li");
                    var listName = root.attr("data-shopping-list");
                    $.post("{{ url_for('archive_list') }}", {shopping_list: listName})
                        .done(function(data) {
                            root.remove();
                            if ($("#list-tab").attr("data-list-name") === listName) {
                                loadShoppingListTab(data["load"]);
                            }
                        });
                }));
    }

    controlArea.append(faButton("fa", "fa-trash", {"size": "lg", "color": "red", "margin-left": " 5px", "float": "left"})
        .click(function() {
            var root = $(this).parents("li");
            var listName = root.attr("data-shopping-list");
            bootbox.confirm({
                message: `Are you sure you want to delete the shopping list "${listName}"?`,
                buttons: {
                    confirm: {label: `Delete "${listName}"`, className: 'btn-success'},
                    cancel: {label: 'Cancel', className: 'btn-outline-danger'}
                },
                callback: function (result) {
                    if (result) {
                        $.ajax({method: "DELETE", url: "{{ url_for('delete_list') }}", data: {shopping_list: listName}})
                            .done(function(data) {
                                root.remove();
                                if ($("#list-tab").attr("data-list-name") === listName) {
                                    loadShoppingListTab(data["load"]);
                                }
                            });
                    }
                }
            });
        }));

    return controlArea;
}

function adminConsoleDisplayListDepartment(department) {
    var departmentName = department || "<no department>";
    var departmentArea = $("<div></div>")
        .attr("data-section", "department")
        .append($("<div></div>")
            .attr("data-sub-section", "display")
            .attr("data-department", department)
            .css("font-style", "italic")
            .css("color", "gray")
            .css("float", "left")
            .text(`Department: ${departmentName}`))
        .append(faButton("fa", "fa-edit", {"color": "darkorange", "margin-left": "5px", "float": "left"})
            .attr("data-sub-section", "edit-button")
            .click(function() {
                var root = $(this).parents("[data-section='department']");
                root.children("form").css("display", "inline-block");
                root.children("[data-sub-section='display']").css("display", "none");
                root.children("[data-sub-section='edit-button']").css("display", "none");

                root.find("form select").empty();

                var selectedDepartment = root.children("[data-department]").attr("data-department");
                $.get("{{ url_for('get_department_info') }}")
                    .done(function(data) {
                        var noDepartmentOption = $("<option></option>")
                            .attr("value", "")
                            .text("<no department>");
                        root.find("form select").append(noDepartmentOption);

                        if (selectedDepartment === undefined) {
                            noDepartmentOption.attr("selected", "");
                        }

                        data["departments"]
                            .sort((dept1, dept2) => dept1["name"].localeCompare(dept2["name"]))
                            .forEach(department => {
                                var option = $("<option></option>")
                                    .attr("value", department["name"])
                                    .text(department["name"]);

                                if (department["name"] === selectedDepartment) {
                                    option.attr("selected", "");
                                }

                                root.find("form select").append(option);
                            });
                    });
            }));

    departmentArea
        .append($("<form></form>")
            .css("display", "none")
            .addClass("form-inline")
            .css("margin-bottom", "0px")
            .attr("action", "")
            .append($("<select></select>")
                .addClass("custom-select")
                .css("float", "left"))
            .change(function() {
                var root = $(this).parents("[data-section='department']");
                var form = root.children("form");
                var shoppingList = $(this).parents("li").find("[data-section='name'] [data-sub-section='display']").attr("data-shopping-list");
                $.post("{{ url_for('update_department') }}", {shopping_list: shoppingList, department: form.children("select").val()})
                    .done(data => {
                        var departmentName = data["department"] === undefined || data["department"] === "" ? "<no department>" : data["department"];
                        root.children("form").css("display", "none");
                        root.children("[data-sub-section='display']")
                            .css("display", "block")
                            .attr("data-department", data["department"])
                            .text(`Department: ${departmentName}`);
                        root.children("[data-sub-section='edit-button']").css("display", "inline-block");
                        $(this).parents("li[data-department]").attr("data-department", data["department"]);
                    });
            }));

    return departmentArea;
}

function adminConsoleDisplayListDeparture(departureTimestamp, archiveView) {
    var departureArea = $("<div></div>")
        .attr("data-section", "departure")
        .css("float", "left");

    if (!archiveView) {
        departureArea.append(faButton("fa", "fa-edit", {"color": "darkorange", "margin-right": "5px", "float": "left"})
            .click(function() {
                $("#edit-list-datepicker").bootstrapMaterialDatePicker("setDate",
                    $(this).parents("[data-section='departure']").children("[data-sub-section='display']").attr("data-departure"));
                $("#edit-list-datepicker").attr("data-shopping-list",
                    $(this).parents("li").find("[data-section='name'] [data-sub-section='display']").attr("data-shopping-list"));
                $("#edit-list-datepicker").click();
            }))
    }

    var departureStr = moment.unix(departureTimestamp).format(LIST_DATEPICKER_FORMAT);
    return departureArea.append($("<div></div>")
        .attr("data-sub-section", "display")
        .attr("data-departure", departureStr)
        .css("font-style", "italic")
        .css("float", "left")
        .text(departureStr));
}

function adminConsoleDisplayListName(listName, archiveView) {
    archiveView = archiveView || false;

    var nameArea = $("<div></div>")
        .attr("data-section", "name");

    nameArea
        .append($("<div></div>")
            .attr("data-sub-section", "display")
            .attr("data-shopping-list", listName)
            .css("float", "left")
            .text(listName));
    if (!archiveView) {
        nameArea.append(faButton("fa", "fa-edit", {"color": "darkorange", "margin-left": "5px", "float": "left"})
            .attr("data-sub-section", "edit-button")
            .click(function() {
                var root = $(this).parents("[data-section='name']");
                root.children("form").css("display", "inline-block");
                root.children("[data-sub-section='display']").css("display", "none");
                root.children("[data-sub-section='edit-button']").css("display", "none");

                root.find("form input").val(root.children("[data-sub-section='display']").attr("data-shopping-list"));
            }));
    }

    nameArea
        .append($("<form></form>")
            .css("display", "none")
            .addClass("needs-validation")
            .addClass("form-inline")
            .css("margin-bottom", "0px")
            .attr("action", "")
            .attr("novalidate", "")
            .append($("<input></input>")
                .addClass("form-control")
                .css("float", "left")
                .attr("type", "text")
                .attr("required", "")
                .val(listName))
            .append(faButton("fa", "fa-check-square", {"size": "lg", "color": "limegreen", "margin-left": "5px", "float": "left"})
                .click(function() {
                    var root = $(this).parents("[data-section='name']");
                    var form = root.children("form");
                    if (form.get(0).checkValidity() === false) {
                        event.preventDefault();
                        event.stopPropagation();
                        form.addClass("was-validated");
                    } else {
                        var currentListName = root.children("[data-sub-section='display']").attr("data-shopping-list");
                        $.post("{{ url_for('update_name') }}", {shopping_list: currentListName, name: form.children("input").val()})
                            .done(data => {
                                root.children("form").css("display", "none");
                                root.children("[data-sub-section='display']")
                                    .css("display", "block")
                                    .attr("data-shopping-list", data["name"])
                                    .text(data["name"]);
                                root.children("[data-sub-section='edit-button']").css("display", "inline-block");
                                $(this).parents("li[data-shopping-list]").attr("data-shopping-list", data["name"]);

                                if ($("#list-tab").attr("data-list-name") === currentListName) {
                                    setListTabName(data["name"]);
                                }
                            })
                            .fail(data => {
                                var error = data["responseJSON"]["error"];
                                if (error["field"] === "name") {
                                    form.children("input").addClass("is-invalid");
                                }
                            });
                    }
                }))
            .append(faButton("fa", "fa-window-close", {"size": "lg", "color": "red", "margin-left": "5px", "float": "left"})
                .click(function() {
                    var root = $(this).parents("[data-section='name']");
                    root.children("form").css("display", "none");
                    root.children("[data-sub-section='display']").css("display", "block");
                    root.children("[data-sub-section='edit-button']").css("display", "inline-block");
                })));

    return nameArea;
}

function adminConsoleDisplayLists(rootElementId, lists, archiveView) {
    archiveView = archiveView || false;

    $(`#${rootElementId}`).empty();
    lists.sort((first, second) => first["departure"] - second["departure"]);
    lists.forEach(list_info => {
        $(`#${rootElementId}`)
            .append($("<li></li>")
                .addClass("list-group-item")
                .attr("data-shopping-list", list_info["name"])
                .append($("<div></div>")
                    .addClass("d-flex")
                    .addClass("justify-content-between")
                    .addClass("align-items-center")
                    .append(adminConsoleDisplayListName(list_info["name"], archiveView))
                    .append(adminConsoleDisplayListDepartment(list_info["department"]))
                    .append($("<div></div>")
                        .append(adminConsoleDisplayListDeparture(list_info["departure"], archiveView))
                        .append(adminConsoleListControl(archiveView)))));
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
    $("#create-list-department").empty();

    $.get("{{ url_for('get_department_info') }}")
        .done(function(data) {
            $("#create-list-department")
                .append($("<option></option>")
                    .attr("value", "")
                    .attr("selected", "")
                    .text("<no department>"));

            data["departments"]
                .sort((dept1, dept2) => dept1["name"].localeCompare(dept2["name"]))
                .forEach(department => {
                    $("#create-list-department")
                        .append($("<option></option>")
                            .attr("value", department["name"])
                            .text(department["name"]));
                });
        });
});

$("#create-list-cancel").click(function() {
    $("#create-list-form")
        .css("display", "none")
        .removeClass("was-validated");
    $("#create-list-name").val("");
    $("#create-list-datepicker").val("");
    $("#create-list-department").empty();
});

$("#create-list-submit").click(function(event) {
    var form = $("#create-list-form");
    if (form.get(0).checkValidity() === false) {
        event.preventDefault();
        event.stopPropagation();
        form.addClass("was-validated");
    } else {
        var name = $("#create-list-name").val();
        var departureSecondsSinceEpoch = moment($("#create-list-datepicker").val(), LIST_DATEPICKER_FORMAT).unix();
        var department = $("#create-list-department").val();
        $.post("{{ url_for('create_new_list') }}", {name: name, departureSeconds: departureSecondsSinceEpoch, department: department})
            .done(function(data) {
                adminConsoleDisplayLists("admin-console-lists-of-lists", data["lists"]);
                loadShoppingListTab($("#create-list-name").val());
                $("#create-list-form")
                    .css("display", "none")
                    .removeClass("was-validated");
                $(".server-feedback").remove();
                $("#create-list-name ~ .invalid-feedback").css("display", "");
                $("#create-list-name").removeClass("is-invalid").val("");
                $("#create-list-datepicker").removeClass("is-invalid").val("");
            })
            .fail(function(data) {
                var error = data["responseJSON"]["error"];
                $("#create-list-form").removeClass("was-validated");
                if (error["field"] === "name") {
                    $("#create-list-name ~ .invalid-feedback").css("display", "none");
                    $("#create-list-name")
                        .addClass("is-invalid")
                        .after($("<div></div>")
                            .addClass("server-feedback")
                            .addClass("invalid-feedback")
                            .text(error["message"]));
                }
            });
    }
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
            $(`li[data-shopping-list="${shoppingList}"] [data-section="departure"] [data-sub-section="display"]`)
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