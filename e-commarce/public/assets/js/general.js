"use strict";
function General() {
  var self = this;
  this.init = function () {
    self.General();
    self.AddFunds();
  };

  this.AddFunds = function () {
    $(document).on("submit", ".actionAddFundsForm", function (event) {
      pageOverlay.show();
      event.preventDefault();
      var _that = $(this),
        _action = PATH + "user/add_funds/process",
        _redirect = _that.data("redirect"),
        _data = _that.serialize();
      _data = _data + "&" + $.param({ token: token });
      $.post(_action, _data, function (_result) {
        setTimeout(function () {
          pageOverlay.hide();
        }, 1500);
        if (is_json(_result)) {
          _result = JSON.parse(_result);
          if (
            _result.status == "success" &&
            typeof _result.redirect_url != "undefined"
          ) {
            window.location.href = _result.redirect_url;
          }
          setTimeout(function () {
            notify(_result.message, _result.status);
          }, 1500);
          setTimeout(function () {
            if (
              _result.status == "success" &&
              typeof _redirect != "undefined"
            ) {
              reloadPage(_redirect);
            }
          }, 2000);
        } else {
          setTimeout(function () {
            $(".add-funds-form-content").html(_result);
          }, 100);
        }
      });
      return false;
    });
  };

  this.General = function () {
    /*----------  View User/back to admin----------*/
    $(document).on("click", ".ajaxViewUser", function (event) {
      event.preventDefault();
      pageOverlay.show();
      var element = $(this),
        url = element.attr("href"),
        data = $.param({ token: token });
      callPostAjax(element, url, data, "");
    });

    // Insert hyper-link
    $(document).on("focusin", function (e) {
      if ($(event.target).closest(".mce-window").length) {
        e.stopImmediatePropagation();
      }
    });

    /*----------  ajaxChangeTicketSubject  ----------*/
    $(document).on("change", ".ajaxChangeTicketSubject", function (event) {
      event.preventDefault();
      var element = $(this);
      var type = element.val();
      $(".ticket_subject").addClass("d-none");
      $("." + type + "-ticket_subject").removeClass("d-none");
    });

    $(document).on("click", ".ajaxModal", function (e) {
      e.preventDefault(); // Prevent default anchor behavior
      var element = $(this);
      var url = element.attr("href");

      $("#modal-ajax").load(url, function () {
        var myM = $("#modal-ajax");

        myM.modal({
          backdrop: "static",
          keyboard: false,
        });

        myM.modal("show");
        $('select:not(.normal)').each(function () {
                $(this).select2({
                    dropdownParent: $(this).parent()
                });
            });
        feather.replace();
      });

      return false;
    });
    // $(document).on("click", ".ajaxModal", function () {
    //   var myOffcanvas = $(".offcanvas");
    //   var bsOffcanvas = new bootstrap.Offcanvas(myOffcanvas.get(0));

    //   var element = $(this);
    //   var url = element.attr("href");
    //   $(".offcanvas").load(url, function () {
    //     bsOffcanvas.show();

    //     $(".offcanvas select").select2({
    //       dropdownParent: myOffcanvas,
    //     });
    //   });
    //   return false;
    // });

    // ajaxChangeLanguage (footer top)
    $(document).on("change", ".ajaxChangeLanguage", function (event) {
      event.preventDefault();
      var element = $(this);
      var pathname =
        element.data("url") +
        "?" +
        "ids=" +
        element.val() +
        "&" +
        "redirect=" +
        element.data("redirect");
      window.location.href = pathname;
    });

    // ajaxChangeLanguageSecond (header top)
    $(document).on("click", ".ajaxChangeLanguageSecond", function (event) {
      event.preventDefault();
      var element = $(this);
      var pathname =
        element.data("url") +
        "?" +
        "ids=" +
        element.data("ids") +
        "&" +
        "redirect=" +
        element.data("redirect");
      window.location.href = pathname;
    });

    // callback ajaxChange
    $(document).on("change", ".ajaxChange", function (event) {
      pageOverlay.show();
      event.preventDefault();
      var element = $(this);
      var id = element.val();
      if (id == "") {
        pageOverlay.hide();
        return false;
      }
      var url = element.data("url") + id;
      var data = $.param({ token: token });
      $.post(url, data, function (_result) {
        pageOverlay.hide();
        setTimeout(function () {
          $("#result_ajaxSearch").html(_result);
        }, 100);
      });
    });

    // callback ajaxSearch
    $(document).on("submit", ".ajaxSearchItem", function (event) {
      pageOverlay.show();
      event.preventDefault();
      var _that = $(this),
        _action = _that.attr("action"),
        _data = _that.serialize();

      _data = _data + "&" + $.param({ token: token });
      $.post(_action, _data, function (_result) {
        setTimeout(function () {
          pageOverlay.hide();
          $("#result_ajaxSearch").html(_result);
        }, 300);
      });
    });

    // callback ajaxSearchItemsKeyUp with keyup and Submit from
    var typingTimer; //timer identifier
    $(document).on("keyup", ".ajaxSearchItemsKeyUp", function (event) {
      $(window).keydown(function (event) {
        if (event.keyCode == 13) {
          event.preventDefault();
          return false;
        }
      });
      event.preventDefault();
      clearTimeout(typingTimer);
      $(".my-search-btn").addClass("btn-loading");
      $(".my-search-btn i").removeClass("d-none");
      var _that = $(this),
        _form = _that.closest("form"),
        _action = _form.attr("action"),
        _data = _form.serialize();
      _data = _data + "&" + $.param({ token: token });

      if ($(this).val().length < 3) {
        $(".my-search-btn").removeClass("btn-loading");
        $("#result_ajaxSearch").fadeOut("slow", "linear");
        return;
      }

      typingTimer = setTimeout(function () {
        $.post(_action, _data, function (_result) {
          setTimeout(function () {
            $(".my-search-btn").removeClass("btn-loading");
            $("#result_ajaxSearch").fadeIn("slow", "linear");
            $("#result_ajaxSearch").html(_result);
          }, 10);
        });
      }, 1500);
    });

    $(document).on("click", ".my-search-btn", function () {
      $(".my-search-btn i").addClass("d-none");
      $("#result_ajaxSearch").html("");
    });

    $(document).on("submit", ".ajaxSearchItemsKeyUp", function (e) {
      e.preventDefault();
    });
    //user notification

    function get_notification(type = "", id = "") {
      $.post(
        $(".notification_open").attr("data-url"),
        { token: token, type: type, id: id },
        function (_result) {
          setTimeout(function () {
            $(".notification_data").removeClass("btn-loading");
            $(".notification_data").html(_result);
          }, 10);
        }
      );
    }
    $(document).on("click", ".notification_open", function () {
      $(".notification_data").addClass("btn-loading");
      get_notification();
    });
    $(document).on(
      "click",
      ".notification_all,.notification_single",
      function () {
        let type = $(this).attr("data-type");
        let id = $(this).attr("data-id");
        $(this).removeClass("bg-dark");
        $(".notification_data").addClass("btn-loading");
        get_notification(type, id);
      }
    );

    setInterval(function () {
      var dataUrl = $(".total_notification").attr("data-url");

      if (typeof dataUrl !== "undefined" && dataUrl !== null) {
        $.post(dataUrl, { token: token, type: user }, function (_result) {
          try {
            _result = JSON.parse(_result);
            if (_result.notification_count) {
              $(".total_notification").html(_result.notification_count);
            }
            if (_result.tickets_count) {
              $(".total_unread_tickets").html(_result.tickets_count);
            }
          } catch (error) {
            console.error("Error parsing JSON response:", error);
          }
        });
      }
    }, 15000);

    // callback actionForm
    $(document).on("submit", ".actionForm", function (event) {
      pageOverlay.show();
      event.preventDefault();
      var _that = $(this),
        _action = _that.attr("action"),
        _redirect = _that.data("redirect");

      var _token = _that.find("input[name=token]").val();
      var _data = _that.serialize();
      if (typeof _token == "undefined") {
        _data = _data + "&" + $.param({ token: token });
      }

      $.post(_action, _data, function (_result) {
        setTimeout(function () {
          pageOverlay.hide();
        }, 1000);
        if (is_json(_result)) {
          _result = JSON.parse(_result);
          setTimeout(function () {
            notify(_result.message, _result.status);
          }, 1000);
          if (_result.redirect) {
            reloadPage(_result.redirect);
          }
          setTimeout(function () {
            if (
              _result.status == "success" &&
              typeof _redirect != "undefined"
            ) {
              reloadPage(_redirect);
            }
          }, 1000);
        } else {
          setTimeout(function () {
            $("#result_notification").html(_result);
          }, 1000);
        }
      });
      return false;
    });

    // actionFormWithoutToast
    $(document).on("submit", ".actionFormWithoutToast", function (event) {
      alertMessage.hide();
      event.preventDefault();
      var _that = $(this),
        _action = _that.attr("action"),
        _data = _that.serialize();
      _data = _data + "&" + $.param({ token: token });
      var _redirect = _that.data("redirect");
      _that.find(".btn-submit").addClass("btn-loading");
      $.post(_action, _data, function (_result) {
        if (is_json(_result)) {
          _result = JSON.parse(_result);
          setTimeout(function () {
            alertMessage.show(_result.message, _result.status);
          }, 1500);

          setTimeout(function () {
            if (
              _result.status == "success" &&
              typeof _redirect != "undefined"
            ) {
              reloadPage(_redirect);
            }
          }, 2000);
        } else {
          setTimeout(function () {
            $("#resultActionForm").html(_result);
          }, 1500);
        }

        setTimeout(function () {
          _that.find(".btn-submit").removeClass("btn-loading");
        }, 1500);
      });
      return false;
    });
  };
}

General = new General();
$(function () {
  General.init();
});
