function adminConsoleDepartmentControl() {
    var controlArea = $("<div></div>")
        .css("float", "left");

    controlArea.append(faButton("fa", "fa-trash", {"size": "lg", "color": "red", "margin-left": " 5px", "float": "left"})
        .click(function() {
            var root = $(this).parents("li");
            var departmentId = root.attr("data-id");
            var departmentName = root.attr("data-name");
            bootbox.confirm({
                message: `Are you sure you want to delete the department "${departmentName}"?`,
                buttons: {
                    confirm: {label: `Delete "${departmentName}"`, className: 'btn-success'},
                    cancel: {label: 'Cancel', className: 'btn-outline-danger'}
                },
                callback: function (result) {
                    if (result) {
                        $.ajax({method: "DELETE", url: "{{ url_for('delete_department') }}", data: {id: departmentId}})
                            .done(function(data) {
                                root.remove();
                            });
                    }
                }
            });
        }));

    return controlArea;
}

function adminConsoleDisplayDepartmentListsAndUsers(lists, users) {
    var listsAndUsers = $("<div></div>")
        .css("font-size", "75%")
        .css("font-style", "italic")
        .css("color", "gray");
    
    if (lists !== undefined && lists !== null && lists.length > 0) {
        listsAndUsers.append($("<div></div>")
            .text(`Shopping Lists: ${lists.sort().join(", ")}`));
    }
    if (users !== undefined && users !== null && users.length > 0) {
        listsAndUsers.append($("<div></div>")
            .text(`Users: ${users.sort().join(", ")}`));
    }
    return listsAndUsers;
}

function adminConsoleDisplayDepartmentName(name) {
    var nameArea = $("<div></div>")
        .attr("data-section", "name")
        .css("float", "left");

    nameArea
        .append($("<div></div>")
            .attr("data-sub-section", "display")
            .attr("data-name", name)
            .css("float", "left")
            .text(name));

    nameArea.append(faButton("fa", "fa-edit", {"color": "darkorange", "margin-left": "5px", "float": "left"})
        .attr("data-sub-section", "edit-button")
        .attr("data-toggle", "modal")
        .attr("data-target", "#modify-department-modal"))
        .click(function() {
            var id = nameArea.parents("[data-id]").attr("data-id");
            $("#modify-department-name").val(nameArea.children("[data-name]").attr("data-name"));
            attachModifyDepartmentHandler("{{ url_for('edit_department') }}", id);
        });

    return nameArea;
}

function adminConsoleDisplayDepartments(rootElementId, departments) {
    $(`#${rootElementId}`).empty();
    departments
        .sort((first, second) => first["name"].localeCompare(second["name"]))
        .forEach(department_info => {
            $(`#${rootElementId}`)
                .append($("<li></li>")
                    .addClass("list-group-item")
                    .attr("data-id", department_info["id"])
                    .attr("data-name", department_info["name"])
                    .attr("data-users", department_info["users"].join(","))
                    .attr("data-lists", department_info["lists"].join(","))
                    .append($("<div></div>")
                        .addClass("d-flex")
                        .addClass("justify-content-between")
                        .addClass("align-items-center")
                        .append(adminConsoleDisplayDepartmentName(department_info["name"]))
                        .append(adminConsoleDepartmentControl()))
                    .append(adminConsoleDisplayDepartmentListsAndUsers(department_info["lists"], department_info["users"])));
        });
}

function attachModifyDepartmentHandler(endpoint, departmentId) {
    $("#modify-department-save")
        .off("click.modify-department")
        .on("click.modify-department", function(event) {
            var form = $("#modify-department-form");
            if (form.get(0).checkValidity() === false) {
                event.preventDefault();
                event.stopPropagation();
                form.addClass("was-validated");
            } else {
                var id = departmentId;
                var name = $("#modify-department-name").val();
                var users = $("#modify-department-users").val();
                var lists = $("#modify-department-lists").val();
                $.post(endpoint, {id: id, name: name, users: users, lists: lists})
                    .done(function(data) {
                        adminConsoleDisplayDepartments("admin-console-list-of-departments", data["departments"]);
                        $(".server-feedback").remove();
                        $("#modify-department-name ~ .invalid-feedback").css("display", "");
                        $("#modify-department-name").removeClass("is-invalid").val("");

                        $("#modify-department-modal").modal("hide");
                    })
                    .fail(function(data) {
                        var error = data["responseJSON"]["error"];
                        form.removeClass("was-validated");
                        if (error["field"] === "name") {
                            $("#modify-department-name ~ .invalid-feedback").css("display", "none");
                            $("#modify-department-name")
                                .addClass("is-invalid")
                                .after($("<div></div>")
                                    .addClass("server-feedback")
                                    .addClass("invalid-feedback")
                                    .text(error["message"]));
                        }
                    });
            }
        });
}

$("#create-department-button").click(function() {
    attachModifyDepartmentHandler("{{ url_for('create_new_department') }}");
});

$("#admin-console-departments-tab").on("show.bs.tab", function() {
    $.get("{{ url_for('get_department_info') }}")
        .done(function(data) {
            adminConsoleDisplayDepartments("admin-console-list-of-departments", data["departments"]);
        });
});

$("#modify-department-modal").on("show.bs.modal", function(event) {
    $("#modify-department-users").empty();
    $("#modify-department-lists").empty();

    var selectedUsersAttr = $(event.relatedTarget).parents("[data-users]").attr("data-users");
    var selectedUsers = selectedUsersAttr === undefined ? [] : selectedUsersAttr.split(",");
    var selectedListsAttr = $(event.relatedTarget).parents("[data-lists]").attr("data-lists");
    var selectedLists = selectedListsAttr === undefined ? [] : selectedListsAttr.split(",");
    $.get("{{ url_for('get_list_info') }}")
        .done(function(data) {
            data["lists"]
                .sort((list1, list2) => list1["name"].localeCompare(list2["name"]))
                .forEach(list_info => {
                    var listEntry = $("<option></option>")
                        .attr("value", list_info["name"])
                        .text(list_info["name"]);

                    if (selectedLists && selectedLists.includes(list_info["name"])) {
                        listEntry.attr("selected", "");
                    }

                    $("#modify-department-lists").append(listEntry);
                });
        });

    $.get("{{ url_for('get_user_info') }}")
        .done(function(data) {
            data["users"]
                .sort((user1, user2) => user1["email"].localeCompare(user2["email"]))
                .forEach(user_info => {
                    var userEntry = $("<option></option>")
                        .attr("value", user_info["email"])
                        .text(user_info["name"] ? `${user_info["name"]} <${user_info["email"]}>` : user_info["email"]);

                    if (selectedUsers && selectedUsers.includes(user_info["email"])) {
                        userEntry.attr("selected", "");
                    }

                    $("#modify-department-users").append(userEntry);
                });
        });
});

$("#modify-department-cancel").click(function() {
    $("#modify-department-form").removeClass("was-validated");
    $("#modify-department-name").val("");
    $("#modify-department-users").removeAttr("selected").val("");
    $("#modify-department-lists").removeAttr("selected").val("");
});
