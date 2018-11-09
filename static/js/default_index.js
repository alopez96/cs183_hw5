// This is the js for the default/index.html view.


var app = function() {

    var self = {};

    Vue.config.silent = false; // show all warnings

    // Extends an array
    self.extend = function(a, b) {
        for (var i = 0; i < b.length; i++) {
            a.push(b[i]);
        }
    };

    // Enumerates an array.
    var enumerate = function(v) { var k=0; return v.map(function(e) {e._idx = k++;});};

    self.open_uploader = function () {
        $("div#uploader_div").show();
        self.vue.is_uploading = true;
    };

    self.close_uploader = function () {
        $("div#uploader_div").hide();
        self.vue.is_uploading = false;
        $("input#file_input").val(""); // This clears the file choice once uploaded.

    };

    self.upload_file = function (event) {
        // Reads the file.
        var input = event.target;
        var file = document.getElementById("file_input").files[0];
        // We want to read the image file, and transform it into a data URL.
        var reader = new FileReader();
        // We add a listener for the load event of the file reader.
                // The listener is called when loading terminates.
                // Once loading (the reader.readAsDataURL) terminates, we have
                // the data URL available.
                reader.addEventListener("load", function () {
                    // An image can be represented as a data URL.
                    // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
                    // Here, we set the data URL of the image contained in the file to an image in the
                    // HTML, causing the display of the file image.
                    self.vue.img_url = reader.result;
                }, false);

        if (file) {
          // Reads the file as a data URL.
           reader.readAsDataURL(file);
            // First, gets an upload URL.
            console.log("Trying to get the upload url");
            $.getJSON('https://upload-dot-luca-teaching.appspot.com/start/uploader/get_upload_url',
                function (data) {
                    // We now have upload (and download) URLs.
                    var put_url = data['signed_url'];
                    var get_url = data['access_url'];
                    console.log("Received upload url: " + put_url);
                    // Uploads the file, using the low-level interface.
                    var req = new XMLHttpRequest();
                    req.addEventListener("load", self.upload_complete(get_url));
                    // TODO: if you like, add a listener
                    req.open("PUT", put_url, true);
                    req.send(file);
                });
        }
    };



    self.get_users = function(){
      $.getJSON(get_users_url,
          function (data) {
            self.vue.logged_in = data.logged_in;
            self.vue.images = data.images;
            self.vue.users = data.users;
            enumerate(self.vue.users);
            enumerate(self.vue.images);
          })
    };

    self.specific_images = function (user_id) {
      console.log(user_id)
      $.getJSON(specific_images_url,
        {
          user_ids:user_id,
        },
        function (data) {
          self.vue.images = data.images;
          enumerate(self.vue.images);
          console.log("images" + self.vue.images);
        })
      };



    self.upload_complete = function(get_url) {
        self.vue.show_images = true;
        self.close_uploader();
        console.log('The file was uploaded; it is now available at ' + get_url);
        // TODO: The file is uploaded.  Now you have to insert the get_url into the database, etc.
        setTimeout(function() {
          $.post(add_image_url,
            {
            get_urls: get_url,
            img_price: self.vue.image_price,
          },
          function (data) {
            $.web2py.enableElement($('#add_image_url'));
            self.vue.images.unshift(data.images);
            enumerate(self.vue.images);
          });
        }, 600);
    };


    self.set_price = function(image_idx){
      console.log('set price index ' + self.vue.images[image_idx].id);
        $.post(update_price_url,
          {
            img_id: self.vue.images[image_idx].id,
            img_price: self.vue.images[image_idx].price,
          })
    };




    self.store_cart = function() {
        localStorage.cart = JSON.stringify(self.vue.cart);
    };

    self.read_cart = function() {
        if (localStorage.cart) {
            self.vue.cart = JSON.parse(localStorage.cart);
        } else {
            self.vue.cart = [];
        }
        self.update_cart();
    };

    self.inc_cart_quantity = function(product_idx, qty) {
        // Inc and dec to desired quantity.
        var p = self.vue.cart[product_idx];
        p.cart_quantity = Math.max(0, p.cart_quantity + qty);
        p.cart_quantity = Math.min(p.quantity, p.cart_quantity);
        self.update_cart();
        self.store_cart();
    };

    self.update_cart = function () {
        enumerate(self.vue.cart);
        var cart_size = 0;
        var cart_total = 0;
        for (var i = 0; i < self.vue.cart.length; i++) {
            var q = self.vue.cart[i].cart_quantity;
            if (q > 0) {
                cart_size++;
                cart_total += q * self.vue.cart[i].price;
            }
        }
        self.vue.cart_size = cart_size;
        self.vue.cart_total = cart_total;
    };


    self.buy_product = function(product_idx) {
        var p = self.vue.images[product_idx];
        // I need to put the product in the cart.
        // Check if it is already there.
        var already_present = false;
        var found_idx = 0;
        for (var i = 0; i < self.vue.cart.length; i++) {
            if (self.vue.cart[i].id === p.id) {
                already_present = true;
                found_idx = i;
            }
        }
        // If it's there, just replace the quantity; otherwise, insert it.
        if (!already_present) {
            found_idx = self.vue.cart.length;
            self.vue.cart.push(p);
        }
        self.vue.cart[found_idx].cart_quantity = p.desired_quantity;
        // Updates the amount of products in the cart.
        self.update_cart();
        self.store_cart();
    };

    self.goto = function (page) {
        self.vue.page = page;
        if (page == 'cart') {
            // prepares the form.
            self.stripe_instance = StripeCheckout.configure({
                key: 'pk_test_CeE2VVxAs3MWCUDMQpWe8KcX',    //put your own publishable key here
                image: 'https://stripe.com/img/documentation/checkout/marketplace.png',
                locale: 'auto',
                token: function(token, args) {
                    console.log('got a token. sending data to localhost.');
                    self.stripe_token = token;
                    self.customer_info = args;
                    self.send_data_to_server();
                }
            });
        };

    };


    self.pay = function () {
        self.stripe_instance.open({
            name: "Your nice cart",
            description: "Buy cart content",
            billingAddress: true,
            shippingAddress: true,
            amount: Math.round(self.vue.cart_total * 100),
        });
        self.vue.cart = [];
        self.vue.cart.splice(0);
        enumerate(self.vue.cart);
    };

    self.send_data_to_server = function () {
        console.log("Payment for:", self.customer_info);
        // Calls the server.
        $.post(purchase_url,
            {
                customer_info: JSON.stringify(self.customer_info),
                transaction_token: JSON.stringify(self.stripe_token),
                amount: self.vue.cart_total,
                cart: JSON.stringify(self.vue.cart),
            },
            function (data) {
                if (data.result === "ok") {
                    // The order was successful.
                    self.vue.cart = [];
                    self.update_cart();
                    self.store_cart();
                    self.goto('prod');
                    $.web2py.flash("Thank you for your purchase");
                } else {
                    $.web2py.flash("The card was declined.");
                }
            }
        );
    };

    self.checkout_toggle = function(){
        self.vue.is_checkout = !self.vue.is_checkout;
        self.stripe_instance = StripeCheckout.configure({
            key: 'pk_test_CeE2VVxAs3MWCUDMQpWe8KcX',    //put your own publishable key here
            image: 'https://stripe.com/img/documentation/checkout/marketplace.png',
            locale: 'auto',
            token: function(token, args) {
                console.log('got a token. sending data to localhost.');
                self.stripe_token = token;
                self.customer_info = args;
                self.send_data_to_server();
            }
        });
    }




    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            is_uploading: false,
            self_page: true, // Leave it to true, so initially you are looking at your own images.
            img_url: null,
            images: [],
            users: [],
            logged_in: false,
            image_price: 0,
            show_images: false,
            cart: [],
            is_in_cart: null,
            is_checkout: false,
            cart_size: 0,
            cart_total: 0,
            page: 'prod'
        },
        methods: {
            open_uploader: self.open_uploader,
            close_uploader: self.close_uploader,
            upload_file: self.upload_file,
            specific_images: self.specific_images,
            get_users: self.get_users,
            set_price: self.set_price,
            add_to_cart: self.add_to_cart,

            inc_desired_quantity: self.inc_desired_quantity,
            inc_cart_quantity: self.inc_cart_quantity,
            buy_product: self.buy_product,
            goto: self.goto,
            do_search: self.get_products,
            pay: self.pay,
            checkout_toggle: self.checkout_toggle,
        }

    });


    self.get_users();
    self.read_cart();
    $("#vue-div").show();

    return self;
};

var APP = null;

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){APP = app();});
