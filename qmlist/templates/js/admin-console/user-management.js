function adminConsoleUserControl() {
    var controlArea = $("<div></div>")
        .css("float", "left");

    controlArea.append(faButton("fa", "fa-trash", {"size": "lg", "color": "red", "margin-left": " 5px", "float": "left"})
        .click(function() {
            var root = $(this).parents("li");
            var userEmail = root.attr("data-email");
            bootbox.confirm({
                message: `Are you sure you want to delete the user "${userEmail}"?`,
                buttons: {
                    confirm: {label: `Delete "${userEmail}"`, className: 'btn-success'},
                    cancel: {label: 'Cancel', className: 'btn-outline-danger'}
                },
                callback: function (result) {
                    if (result) {
                        $.ajax({method: "DELETE", url: "{{ url_for('delete_user') }}", data: {email: userEmail}})
                            .done(function(data) {
                                root.remove();
                            });
                    }
                }
            });
        }));

    return controlArea;
}

function adminConsoleDisplayUserName(email, name, role, department) {
    var nameArea = $("<div></div>")
        .attr("data-section", "name")
        .css("float", "left");

    nameArea
        .append($("<div></div>")
            .attr("data-sub-section", "display")
            .attr("data-email", email)
            .attr("data-name", name)
            .attr("data-role", role)
            .attr("data-department", department)
            .css("float", "left")
            .text(name ? `${name} <${email}>` : email)
            .append($("<span></span>")
                .css("font-style", "italic")
                .css("font-size", "75%")
                .css("vertical-align", "middle")
                .css("color", "gray")
                .css("margin-left", "5px")
                .text(role)));

    nameArea.append(faButton("fa", "fa-edit", {"color": "darkorange", "margin-left": "5px", "float": "left"})
        .attr("data-sub-section", "edit-button")
        .attr("data-toggle", "modal")
        .attr("data-target", "#modify-user-modal"))
        .click(function() {
            $("#modify-user-name").val(nameArea.children("[data-name]").attr("data-name"));
            $("#modify-user-email")
                .val(nameArea.children("[data-email]").attr("data-email"))
                .attr("readonly", "")
                .removeClass("form-control")
                .addClass("form-control-plaintext");
            attachModifyUserHandler("{{ url_for('edit_user') }}");
        });

    return nameArea;
}

function adminConsoleDisplayUsersDepartment(department) {
    var departmentDisplay = $("<div></div>")
        .css("font-size", "75%")
        .css("font-style", "italic")
        .css("color", "gray");
    
    if (department !== undefined && department !== null && department !== "") {
        departmentDisplay.text(`Department: ${department}`);
    }
    return departmentDisplay;
}

function adminConsoleDisplayUsers(rootElementId, users) {
    $(`#${rootElementId}`).empty();
    users
        .sort((first, second) => first["email"].localeCompare(second["email"]))
        .forEach(user_info => {
            $(`#${rootElementId}`)
                .append($("<li></li>")
                    .addClass("list-group-item")
                    .attr("data-email", user_info["email"])
                    .attr("data-name", user_info["name"])
                    .attr("data-role", user_info["role"])
                    .attr("data-department", user_info["department"])
                    .append($("<div></div>")
                        .addClass("d-flex")
                        .addClass("justify-content-between")
                        .addClass("align-items-center")
                        .append(adminConsoleDisplayUserName(
                            user_info["email"], user_info["name"], user_info["role"], user_info["department"]))
                        .append(adminConsoleUserControl()))
                    .append(adminConsoleDisplayUsersDepartment(user_info["department"])));
        });
}

function attachModifyUserHandler(endpoint) {
    $("#modify-user-save")
        .off("click.modify-user")
        .on("click.modify-user", function(event) {
            var form = $("#modify-user-form");
            if (form.get(0).checkValidity() === false) {
                event.preventDefault();
                event.stopPropagation();
                form.addClass("was-validated");
            } else {
                var name = $("#modify-user-name").val();
                var email = $("#modify-user-email").val();
                var role = $("#modify-user-role").val();
                var department = $("#modify-user-department").val();
                $.post(endpoint, {name: name, email: email, role: role, department: department})
                    .done(function(data) {
                        adminConsoleDisplayUsers("admin-console-list-of-users", data["users"]);
                        $(".server-feedback").remove();
                        $("#modify-user-name ~ .invalid-feedback").css("display", "");
                        $("#modify-user-name").removeClass("is-invalid").val("");
                        $("#modify-user-email ~ .invalid-feedback").css("display", "");
                        $("#modify-user-email").removeClass("is-invalid").val("");

                        $("#modify-user-modal").modal("hide");
                    })
                    .fail(function(data) {
                        var error = data["responseJSON"]["error"];
                        form.removeClass("was-validated");
                        if (["name", "email"].includes(error["field"])) {
                            var fieldId = error["field"] === "name" ? "modify-user-name" : "modify-user-email";
                            $(`#${fieldId} ~ .invalid-feedback`).css("display", "none");
                            $(`#${fieldId}`)
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

$("#create-user-button").click(function() {
    attachModifyUserHandler("{{ url_for('create_new_user') }}");
    $("#modify-user-email")
        .removeAttr("readonly")
        .removeClass("form-control-plaintext")
        .addClass("form-control");
});

$("#admin-console-users-tab").on("show.bs.tab", function() {
    $.get("{{ url_for('get_user_info') }}")
        .done(function(data) {
            adminConsoleDisplayUsers("admin-console-list-of-users", data["users"]);
        });
});

$("#modify-user-modal").on("show.bs.modal", function(event) {
    $("#modify-user-role").empty();
    $("#modify-user-department").empty();

    var selectedRole = $(event.relatedTarget).parents("[data-role]").attr("data-role");
    $.get("{{ url_for('get_roles') }}")
        .done(function(data) {
            selectedRole = selectedRole || data["default"];
            data["roles"].forEach(role => {
                var roleEntry = $("<option></option>")
                    .attr("value", role)
                    .text(role);

                if (role === selectedRole) {
                    roleEntry.attr("selected", "");
                }

                $("#modify-user-role").append(roleEntry);
            });
        });

    var selectedDepartment = $(event.relatedTarget).parents("[data-department]").attr("data-department");
    $.get("{{ url_for('get_department_info') }}")
        .done(function(data) {
            var noDepartmentOption = $("<option></option>")
                .attr("value", "")
                .text("<no department>");
            $("#modify-user-department").append(noDepartmentOption);

            if (selectedDepartment === undefined) {
                noDepartmentOption.attr("selected", "");
            }
            data["departments"]
                .sort((dept1, dept2) => dept1["name"].localeCompare(dept2["name"]))
                .forEach(department => {
                    var departmentEntry = $("<option></option>")
                        .attr("value", department["name"])
                        .text(department["name"]);

                    if (department["name"] === selectedDepartment) {
                        departmentEntry.attr("selected", "");
                    }

                    $("#modify-user-department").append(departmentEntry);
                });
        });
});

$("#modify-user-cancel").click(function() {
    $("#modify-user-form").removeClass("was-validated");
    $("#modify-user-name").val("");
    $("#modify-user-email").val("");
});
