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

function adminConsoleDisplayUserName(email, name) {
    var nameArea = $("<div></div>")
        .attr("data-section", "name");

    nameArea
        .append($("<div></div>")
            .attr("data-sub-section", "display")
            .attr("data-email", email)
            .attr("data-name", name)
            .css("float", "left")
            .text(name !== null && name !== undefined ? `${name} <${email}>` : email));

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

function adminConsoleDisplayUsers(rootElementId, users) {
    $(`#${rootElementId}`).empty();
    users.sort((first, second) => first["email"] - second["email"]);
    users.forEach(user_info => {
        $(`#${rootElementId}`)
            .append($("<li></li>")
                .addClass("list-group-item")
                .addClass("d-flex")
                .addClass("justify-content-between")
                .addClass("align-items-center")
                .attr("data-email", user_info["email"])
                .attr("data-name", user_info["name"])
                .append(adminConsoleDisplayUserName(user_info["email"], user_info["name"]))
                .append($("<div></div>")
                    .append(adminConsoleUserControl())));
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
                $.post(endpoint, {name: $("#modify-user-name").val(), email: $("#modify-user-email").val()})
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

$("#modify-user-cancel").click(function() {
    $("#modify-user-form").removeClass("was-validated");
    $("#modify-user-name").val("");
    $("#modify-user-email").val("");
});