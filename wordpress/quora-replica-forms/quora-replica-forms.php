<?php
/**
 * Plugin Name: Quora Replica Forms
 * Description: Same-origin contact and newsletter endpoints for the isolated Elementor Free replica.
 * Version: 1.0.0
 * Requires at least: 6.2
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Quora_Replica_Forms {
    private const API_NAMESPACE = 'quora-replica/v1';

    public static function boot(): void {
        add_action('rest_api_init', [self::class, 'register_routes']);
    }

    public static function register_routes(): void {
        register_rest_route(self::API_NAMESPACE, '/contact', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [self::class, 'submit_contact'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route(self::API_NAMESPACE, '/newsletter', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [self::class, 'submit_newsletter'],
            'permission_callback' => '__return_true',
        ]);
    }

    private static function rate_limit(string $kind) {
        $address = isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : 'unknown';
        $key = 'quora_replica_' . md5($kind . '|' . $address . '|' . wp_salt('nonce'));
        $attempts = (int) get_transient($key);

        if ($attempts >= 6) {
            return new WP_Error(
                'quora_replica_rate_limited',
                'Please wait a few minutes before trying again.',
                ['status' => 429]
            );
        }

        set_transient($key, $attempts + 1, 10 * MINUTE_IN_SECONDS);
        return true;
    }

    private static function is_bot(WP_REST_Request $request): bool {
        return trim((string) $request->get_param('Website')) !== '';
    }

    public static function submit_contact(WP_REST_Request $request) {
        if (self::is_bot($request)) {
            return new WP_REST_Response(['ok' => true], 200);
        }

        $limit = self::rate_limit('contact');
        if (is_wp_error($limit)) {
            return $limit;
        }

        $name = sanitize_text_field((string) $request->get_param('Name'));
        $email = sanitize_email((string) $request->get_param('Email'));
        $country = sanitize_text_field((string) $request->get_param('Country'));
        $note = sanitize_textarea_field((string) $request->get_param('Note'));

        if ($name === '' || !is_email($email) || $country === '' || $note === '') {
            return new WP_Error(
                'quora_replica_invalid_contact',
                'Please complete every required field with a valid email address.',
                ['status' => 422]
            );
        }

        $recipient = sanitize_email((string) get_option('admin_email'));
        $subject = sprintf('Quora enquiry from %s', $name);
        $message = implode("\n", [
            'Name: ' . $name,
            'Email: ' . $email,
            'Country: ' . $country,
            '',
            $note,
        ]);
        $headers = ['Reply-To: ' . $name . ' <' . $email . '>'];

        if (!wp_mail($recipient, $subject, $message, $headers)) {
            return new WP_Error(
                'quora_replica_delivery_failed',
                'The message could not be delivered. Please try again later.',
                ['status' => 500]
            );
        }

        return new WP_REST_Response(['ok' => true], 200);
    }

    public static function submit_newsletter(WP_REST_Request $request) {
        if (self::is_bot($request)) {
            return new WP_REST_Response(['ok' => true], 200);
        }

        $limit = self::rate_limit('newsletter');
        if (is_wp_error($limit)) {
            return $limit;
        }

        $email = sanitize_email((string) $request->get_param('Email'));
        if (!is_email($email)) {
            return new WP_Error(
                'quora_replica_invalid_email',
                'Please enter a valid email address.',
                ['status' => 422]
            );
        }

        $subscribers = get_option('quora_replica_subscribers', []);
        if (!is_array($subscribers)) {
            $subscribers = [];
        }
        $subscribers[$email] = current_time('mysql', true);
        update_option('quora_replica_subscribers', $subscribers, false);

        wp_mail(
            sanitize_email((string) get_option('admin_email')),
            'New Quora newsletter signup',
            'Newsletter signup: ' . $email
        );

        return new WP_REST_Response(['ok' => true], 200);
    }
}

Quora_Replica_Forms::boot();
