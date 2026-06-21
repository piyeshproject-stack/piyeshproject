"use strict";
function Admin() {
  var self = this;
  this.init = function () {
    self.Item();
    self.FileManager();
    self.previewImg();
    plugin_editor(".plugin_editor", { height: 100 });
  };

  // Upload media on Settings page
  this.FileManager = function () {
    var url = PATH + "upload_files";
    $(document).on("click", ".settings_fileupload", function () {
      var element = $(this);
      if (element.data('fileupload-initialized')) return;
      
      var type = element.data("type");
      var _closest_div = element.closest("div");
      
      element.fileupload({
        url: url,
        formData: { token: token, user: user, type: type },
        dataType: "json",
        submit: function (e, data) {
          pageOverlay.show();
        },
        done: function (e, data) {
          pageOverlay.hide();

          if (data.result.status == "success") {
            var _img_link = data.result.link;
            _closest_div.children("input").val(_img_link);
            _closest_div.find("img").attr("src", PATH + _img_link);
            $(".canvas .img-fluid").attr("src", PATH + _img_link);

            notify(data.result.message, data.result.status);
          } else {
            notify(data.result.message, data.result.status);
          }
        },
        fail: function (e, data) {
          pageOverlay.hide();
          notify("Upload failed", "error");
        }
      });
      
      element.data('fileupload-initialized', true);
    });

    $(document).on("click", ".settings_all_fileupload", function () {
      var element = $(this);
      if (element.data('fileupload-initialized')) return;
      
      url = PATH + "upload_all_files";
      var _closest_div = element.closest("div");
      
      element.fileupload({
        url: url,
        formData: { token: token },
        dataType: "json",
        done: function (e, data) {
          if (data.result.status == "success") {
            var _img_link = data.result.link;
            _closest_div.children("input").val(_img_link);
            notify(data.result.message, data.result.status);
          } else {
            notify(data.result.message, data.result.status);
          }
        },
      });
      
      element.data('fileupload-initialized', true);
    });
  };
  this.previewImg = function () {
    function readURL(input) {
      if (input.files && input.files[0]) {
        var reader = new FileReader();

        reader.onload = function (e) {
          $(input).prev(".img-fluid").attr("src", e.target.result);
        };

        reader.readAsDataURL(input.files[0]);
      }
    }
    $(".settings_fileupload").on("change", function (e) {
      var file = e.target.files[0];
      var reader = new FileReader();
      var preview = $(this).prev(".profile-photo").find(".img-fluid");
      reader.onload = function (e) {
        preview.attr("src", e.target.result);
      };

      reader.readAsDataURL(file);
    });
  };

  this.Item = function () {
    // check all
    $(document).on("click", ".check-all", function () {
      var element = $(this),
        _checkName = element.data("name");
      $("." + _checkName + "").prop("checked", this.checked);
    });

    // ajaxChangeCurrencyCode - Payment update form
    $(document).on("change", ".ajaxChangeCurrencyCode", function () {
      var element = $(this),
        currency_code = element.val();
      $(".new-currency-code").html(currency_code);
    });

    // ajaxToggleItemStatus
    $(document).on("click", ".ajaxToggleItemStatus", function () {
      var element = $(this),
        id = element.data("id"),
        url = element.data("action") + id;
      var status = 0;
      if (element.is(":checked")) status = 1;
      var data = $.param({ token: token, status: status });
      callPostAjax(element, url, data, "status");
    });

    // ajaxChangeSort
    $(document).on("change", ".ajaxChangeSort", function () {
      var element = $(this),
        id = element.data("id"),
        url = element.data("url") + id,
        sort = element.val();
      var data = $.param({ token: token, sort: sort });
      callPostAjax(element, url, data, "sort");
    });

    // callback Delete item
    $(document).on("click", ".ajaxDeleteItem", function (event) {
      event.preventDefault();
      var element = $(this),
        confirm_message = element.data("confirm_ms");
      if (!confirm_notice(confirm_message)) {
        return;
      }
      var url = element.attr("href"),
        data = $.param({ token: token });
      callPostAjax(element, url, data, "delete-item");
    });

    $(document).on("click", ".ajaxActionOptions", function (event) {
      event.preventDefault();
      var element = $(this),
        type = element.data("type");
      if (
        type == "delete" ||
        type == "deactive" ||
        type == "delete-all" ||
        type == "restore"
      ) {
        if (!confirm_notice(type)) {
          return;
        }
      }
      var url = element.attr("href");
      var selected_ids = [];
      $(".check-item:checked").each(function () {
        selected_ids.push($(this).val());
      });
      if (
        selected_ids.length <= 0 &&
        type != "delete-all" &&
        type != "restore"
      ) {
        alert("Please choose at least one item");
      } else {
        selected_ids = selected_ids.join(",");
        var data = "ids=" + selected_ids + "&" + $.param({ token: token });
        pageOverlay.show();
        var type_post = "";
        var array_type_copy_clipboard = [
          "copy_id",
          "copy_order_id",
          "copy_api_refill_id",
          "copy_api_order_id",
          "copy_api_order_id",
        ];
        if (array_type_copy_clipboard.includes(type) === true) {
          type_post = "copy-to-clipboard";
        }
        callPostAjax(element, url, data, type_post);
      }
    });
  };
}

Admin = new Admin();
$(function () {
  Admin.init();
});
