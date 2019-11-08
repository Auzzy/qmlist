function search(shoppingListName, searchTerm, pageno) {
    if (searchTerm === undefined) {
        searchTerm = $("#search-box").val();
    }

    if (pageno === undefined || pageno === null) {
        pageno = 1;
    }

    if (pageno == 1) {
        $("#search-results").empty();
    }

    $.get("{{ url_for('search') }}", {"shopping-list": shoppingListName, "search": searchTerm, "pageno": pageno})
        .done(function(results) {
            var searchTerm = results["search-term"];
            // $("#search-results").empty();
            $("#search-results").attr("data-search-term", searchTerm)
            $("#search-results").attr("data-next-page", pageno + 1);

            results["search-results"].forEach(function(result, index) {
                var searchResult = $("<li></li>")
                    .attr("id", "search-result-" + index)
                    .addClass("list-group-item")
                    .addClass("d-flex")
                    .addClass("justify-content-between")
                    .addClass("align-items-center")
                    .attr("data-name", result["name"])
                    .append($("<div></div>")
                        .addClass("text-truncate")
                        .attr("style", "max-width: 93%")
                        .attr("data-toggle", "tooltip")
                        .attr("title", result["name"])
                        .text(result["name"]));

                if ($("#shopping-list").attr("data-editable") === "true") {
                    var quantity = quantityButtons(
                        shoppingListName,
                        result["name"],
                        result["quantity"]);

                    searchResult
                        .attr("data-quantity", result["quantity"])
                        .append(quantity);
                }

                $('[data-toggle="tooltip"]').tooltip();
                $("#search-results").append(searchResult);
            });

            var resultLen = results["total-results"];
            var resultWord = resultLen == 1 ? "result" : "results";
            var resultsSummary = resultLen + " " + resultWord + " for \"" + searchTerm + "\"";
            $("#search-results-summary")
                .append("<span></span>")
                    .addClass("font-weight-bold")
                    .text(resultsSummary);

            $("#search-box").val("");
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            alert(errorThrown);
        });
}

$("#search-button").click(function() {
    search($("#list-tab").attr("data-list-name"));
});

$("#search-box").keypress(function(event){
    var keycode = (event.keyCode ? event.keyCode : event.which);
    // ENTER
    if(keycode == '13') {
        search($("#list-tab").attr("data-list-name"));
    }
});

$('#search-results').on('scroll', function detectBottom() {
    var shoppingListName = $("#list-tab").attr("data-list-name");

    if($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight - 1000) {
        $('#search-results').off('scroll');

        search(
            shoppingListName,
            $("#search-results").attr("data-search-term"),
            parseInt($("#search-results").attr("data-next-page")));

        setTimeout(function () {
            $('#search-results').on('scroll', detectBottom);
        }, 250);
    }
})