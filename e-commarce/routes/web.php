<?php

use App\Http\Controllers\LicenseController;
use Illuminate\Support\Facades\Route;

// Restrict access if the license is invalid
if (!config('web.license_status')) {
    die(config('web.license_message')); // Stop execution if the license is invalid
}

// Public route to check license validity
Route::get('/validate-license', [LicenseController::class, 'validateLicense']);

// Protected routes (only accessible if the license is valid)
Route::get('/', function () {
    return view('welcome');
});

Route::get('/dashboard', function () {
    return view('dashboard');
});
