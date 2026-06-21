$(document).ready(function () {
  var currentUrl = window.location.href;

  $('.sidebar-menu li a').each(function() {
      var $this = $(this);
      if ($this.attr('href') === currentUrl) {
          $this.closest('li').addClass('active');
          $this.addClass('active');
          
          // If the active link is inside a dropdown menu, open the dropdown
          if ($this.closest('ul.dropdown-menu').length) {
              $this.closest('ul.dropdown-menu').parent().addClass('active');
              $this.closest('ul.dropdown-menu').slideDown();
          }
      }
  });
  $(".sortable").sortable({
    update: function (event, ui) {
      var url = $(this).data("action");
      var methods = [];
      $(".sortable tr").each(function (key, val) {
        let methodCode = $(val).data("code");
        methods.push(methodCode);
      });
      var data = $.param({ sort: methods, token: token });
      $.post(url, data, function (_result) {
        _result = JSON.parse(_result);
        setTimeout(function () {
          notify(_result.message, _result.status);
        }, 100);
      });
    },
  });
  $("#sortable").disableSelection();
});
