<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // SMS — yerelde 'log' (kod log'a yazılır), prod'da 'netgsm'
    'sms' => [
        'driver' => env('SMS_DRIVER', env('NETGSM_USER') ? 'netgsm' : 'log'),
        'netgsm' => [
            'user'      => env('NETGSM_USER'),
            'password'  => env('NETGSM_PASSWORD'),
            'msgheader' => env('NETGSM_MSGHEADER', 'LIFTOTONOM'),
        ],
    ],

    // OTP ayarları
    'otp' => [
        'length'       => (int) env('OTP_LENGTH', 6),
        'ttl_minutes'  => (int) env('OTP_TTL_MINUTES', 3),
        'max_attempts' => (int) env('OTP_MAX_ATTEMPTS', 3),
    ],

];
