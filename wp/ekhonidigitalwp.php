<?php
/*
 * Plugin Name: FN PAY
 * Plugin URI: https://freelancingbyrifat.top
 * Description: This plugin allows your customers to pay with Bkash, Nagad, Rocket, and all BD gateways via FN PAY Payment Gateway.
 * Author: FN PAY
 * Author URI: https://freelancingbyrifat.top
 * Version: 1.0.1
 * Requires at least: 5.2
 * Requires PHP: 7.2
 * License: GPL v2 or later
 * Text Domain: fn-pay-payment
 */

/*
 * This action hook registers our PHP class as a WooCommerce payment gateway
 */
add_action('plugins_loaded', 'fn_pay_payment_init_gateway_class');

function fn_pay_payment_init_gateway_class()
{
    if (!class_exists('WC_Payment_Gateway')) return;

    class WC_fn_pay_payment_Gateway extends WC_Payment_Gateway
    {
        public function __construct()
        {
            $this->id = 'fn_pay_payment';
            $this->icon = 'https://paymentpay.freelancingbyrifat.top/payment-gateway.webp'; // Updated to your new domain
            $this->has_fields = false;
            $this->method_title = __('FN PAY PAYMENT', 'fn-pay-payment');
            $this->method_description = __('Secure Checkout via FN PAY Payment Gateway', 'fn-pay-payment');

            $this->supports = array('products');

            $this->init_form_fields();
            $this->init_settings();

            $this->title = $this->get_option('title');
            $this->description = $this->get_option('description');
            $this->enabled = $this->get_option('enabled');

            add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));
            add_action('woocommerce_api_' . strtolower(get_class($this)), array($this, 'handle_webhook'));
        }

        public function init_form_fields()
        {
            $this->form_fields = array(
                'enabled' => array(
                    'title'       => 'Enable/Disable',
                    'label'       => 'Enable FN PAY Payment',
                    'type'        => 'checkbox',
                    'default'     => 'no'
                ),
                'title' => array(
                    'title'       => 'Title',
                    'type'        => 'text',
                    'description' => 'This controls the title which the user sees during checkout.',
                    'default'     => 'FN PAY - Mobile Banking (bKash/Nagad/Rocket)',
                    'desc_tip'    => true,
                ),
                'apikeys' => array(
                    'title'       => 'Enter API Key',
                    'type'        => 'password', // Changed to password for security in admin panel
                    'default'     => '',
                    'desc_tip'    => true,
                ),
                'currency_rate' => array(
                    'title'       => 'Enter USD Rate',
                    'type'        => 'number',
                    'default'     => '120',
                    'desc_tip'    => true,
                ),
                'is_digital' => array(
                    'title'       => 'Digital Product Mode',
                    'label'       => 'Auto-complete order for digital products',
                    'type'        => 'checkbox',
                    'default'     => 'yes'
                ),
                'payment_site' => array(
                    'title'             => 'Payment API URL',
                    'type'              => 'text',
                    'default'           => 'https://paymentpay.freelancingbyrifat.top/', // Automatically pointing to your CI4 server
                    'desc_tip'          => true,
                    'custom_attributes' => array(
                        'readonly' => 'readonly'
                    ),
                ),
            );
        }

        public function process_payment($order_id)
        {
            global $woocommerce;
            $order = wc_get_order($order_id);
            $current_user = wp_get_current_user();

            $subtotal = WC()->cart->subtotal;
            $shipping_total = WC()->cart->get_shipping_total();
            $fees = WC()->cart->get_fee_total();
            $discount_excl_tax_total = WC()->cart->get_cart_discount_total();
            $discount_tax_total = WC()->cart->get_cart_discount_tax_total();
            $discount_total = $discount_excl_tax_total + $discount_tax_total;
            $total = $subtotal + $shipping_total + $fees - $discount_total;

            if ($order->get_currency() == 'USD') {
                $total = $total * $this->get_option('currency_rate');
            }

            if ($order->get_status() != 'completed') {
                $order->update_status('pending', __('Customer is being redirected to FN PAY Payment Gateway', 'fn-pay-payment'));
            }

            $data = array(
                "cus_name"    => $current_user->user_firstname ?: 'Guest',
                "cus_email"   => $current_user->user_email ?: 'guest@example.com',
                "amount"      => $total,
                "webhook_url" => site_url('/?wc-api=wc_fn_pay_payment_gateway&order_id=' . $order->get_id()), // FIXED webhook callback name
                "success_url" => $this->get_return_url($order),
                "cancel_url"  => wc_get_checkout_url()
            );

            $header = array(
                "api" => $this->get_option('apikeys'),
                "url" => $this->get_option('payment_site') . "api/payment/create"
            );

            $response = $this->create_payment($data, $header);
            $data = json_decode($response, true);

            // SECURITY FIX: Ensure API actually returned a redirect URL
            if (isset($data['payment_url']) && !empty($data['payment_url'])) {
                return array(
                    'result'   => 'success',
                    'redirect' => $data['payment_url']
                );
            } else {
                wc_add_notice(__('Gateway Error: Unable to connect to FN PAY server. Please try again.', 'fn-pay-payment'), 'error');
                return array('result' => 'fail');
            }
        }

        public function create_payment($data = "", $header = '')
        {
            $headers = array(
                'Content-Type: application/json',
                'API-KEY: ' . $header['api'],
            );
            $url = $header['url'];
            $curl = curl_init();
            $data = json_encode($data);

            curl_setopt_array($curl, array(
                CURLOPT_URL => $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_ENCODING => '',
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 30, // Increased timeout for stability
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_CUSTOMREQUEST => 'POST',
                CURLOPT_POSTFIELDS => $data,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => 0
            ));

            $response = curl_exec($curl);
            curl_close($curl);
            return $response;
        }

        public function update_order_status($order)
        {
            if(!isset($_REQUEST['transactionId'])) return false;
            
            $transactionId = sanitize_text_field($_REQUEST['transactionId']);
            $data = array(
                "transaction_id" => $transactionId,
            );
            $header = array(
                "api" => $this->get_option('apikeys'),
                "url" => $this->get_option('payment_site') . "api/payment/verify"
            );

            $response = $this->create_payment($data, $header);
            $data = json_decode($response, true);

            if ($order->get_status() != 'completed') {
                if (isset($data['status']) && $data['status'] == "COMPLETED") {
                    
                    $transaction_id = sanitize_text_field($data['transaction_id']);
                    $amount = floatval($data['amount']);
                    $order_total = floatval($order->get_total());
                    $sender_number = isset($data['cus_email']) ? sanitize_text_field($data['cus_email']) : 'N/A';
                    
                    // SECURITY FIX: AMOUNT VERIFICATION
                    // Check if the paid amount from gateway is greater than or equal to WooCommerce order total
                    if ($amount >= $order_total) {
                        
                        $note = sprintf(__("FN PAY Success | Paid: ৳%s | TrxID: %s | Sender: %s", 'fn-pay-payment'), $amount, $transaction_id, $sender_number);
                        
                        if ($this->get_option('is_digital') === 'yes') {
                            $order->update_status('completed', $note);
                        } else {
                            $order->update_status('processing', $note);
                        }
                        
                        $order->reduce_order_stock();
                        $order->payment_complete($transaction_id);
                        return true;
                        
                    } else {
                        // SCAM ALERT: Amount paid is less than order amount
                        $warning = sprintf(__("SECURITY WARNING: Amount mismatch! Customer paid ৳%s, but Order requires ৳%s. TrxID: %s.", 'fn-pay-payment'), $amount, $order_total, $transaction_id);
                        $order->update_status('on-hold', $warning);
                        return true;
                    }
                } else {
                    $order->update_status('on-hold', __('FN PAY API Error: Transaction verification failed or not completed.', 'fn-pay-payment'));
                    return true;
                }
            }
        }

        public function handle_webhook()
        {
            if(isset($_GET['order_id'])) {
                $order_id = intval($_GET['order_id']);
                $order = wc_get_order($order_id);

                if ($order) {
                    $this->update_order_status($order);
                }
            }
            status_header(200);
            wp_send_json(['message' => 'FN PAY Webhook processed']);
            exit();
        }
    }

    function fn_pay_payment_add_gateway_class($gateways)
    {
        $gateways[] = 'WC_fn_pay_payment_Gateway';
        return $gateways;
    }
    
    add_filter('woocommerce_payment_gateways', 'fn_pay_payment_add_gateway_class');
}