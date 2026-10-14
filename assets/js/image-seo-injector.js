// ============================================================
// assets/js/image-seo-injector.js
// Client-Side Image SEO & EXIF Metadata Injector
// 100% Browser-based: No Cloudflare Workers or Server needed!
// ============================================================

window.ImageSeoInjector = (function() {
    'use strict';

    // Helper: Convert string to UTF-16LE byte array for Windows/Google XP metadata tags
    function strToUtf16LEBytes(str) {
        if (!str) str = '';
        var bytes = [];
        for (var i = 0; i < str.length; i++) {
            var code = str.charCodeAt(i);
            bytes.push(code & 0xff);
            bytes.push((code >> 8) & 0xff);
        }
        bytes.push(0);
        bytes.push(0);
        return bytes;
    }

    // Helper: Convert DataURL to File object
    function dataURLtoFile(dataurl, filename) {
        var arr = dataurl.split(',');
        var mimeMatch = arr[0].match(/:(.*?);/);
        var mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        var bstr = atob(arr[1]);
        var n = bstr.length;
        var u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    }

    // Helper: Generate clean SEO URL Slug from string
    function slugify(text) {
        if (!text) return 'product-photo';
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/[\s\W-]+/g, '-') // Replace spaces and non-alphanumeric with -
            .replace(/^-+|-+$/g, '')    // Remove leading and trailing -
            .slice(0, 70);              // Max slug length
    }

    // Read cached or current settings from localStorage/CONFIG
    function getStoreSettings() {
        var storeName = 'Online Store';
        var siteKeywords = '';
        var siteUrl = '';

        try {
            var cached = localStorage.getItem('site_settings_cache');
            if (cached) {
                var s = JSON.parse(cached);
                if (s.store_name) storeName = s.store_name;
                if (s.seo_keywords) siteKeywords = s.seo_keywords;
                if (s.site_url) siteUrl = s.site_url;
            }
        } catch(e) {}

        if (typeof CONFIG !== 'undefined') {
            if (!storeName || storeName === 'Online Store') storeName = CONFIG.STORE_NAME || storeName;
            if (!siteUrl) siteUrl = CONFIG.SITE_URL || '';
        }

        return {
            storeName: storeName,
            siteKeywords: siteKeywords,
            siteUrl: siteUrl
        };
    }

    /**
     * 2-Way Tag Merger
     * Combines:
     *   1. Site-wide settings tags (store_name, seo_keywords)
     *   2. Product-specific tags (Product name keywords, Category names, Custom Product tags)
     */
    function buildMergedTags(opts) {
        opts = opts || {};
        var settings = getStoreSettings();

        var tagSet = new Set();

        // 1. Product Name keywords
        if (opts.productName) {
            tagSet.add(opts.productName.trim());
            // Add individual significant words if product name has multiple words
            opts.productName.split(/[\s,-]+/).forEach(function(w) {
                if (w && w.length > 2) tagSet.add(w.trim());
            });
        }

        // 2. Categories
        if (Array.isArray(opts.categoryNames)) {
            opts.categoryNames.forEach(function(c) {
                if (c && typeof c === 'string' && c.trim()) tagSet.add(c.trim());
            });
        } else if (typeof opts.categoryNames === 'string' && opts.categoryNames.trim()) {
            opts.categoryNames.split(',').forEach(function(c) {
                if (c.trim()) tagSet.add(c.trim());
            });
        }

        // 3. Variant / Color
        if (opts.variantName && typeof opts.variantName === 'string' && opts.variantName.trim()) {
            tagSet.add(opts.variantName.trim());
            if (opts.productName) {
                tagSet.add(opts.productName.trim() + ' ' + opts.variantName.trim());
            }
        }

        // 4. Custom Product Tags (from admin product form)
        if (opts.productTags) {
            var rawTags = typeof opts.productTags === 'string' ? opts.productTags.split(',') : opts.productTags;
            if (Array.isArray(rawTags)) {
                rawTags.forEach(function(t) {
                    if (t && t.trim()) tagSet.add(t.trim());
                });
            }
        }

        // 5. Site-wide settings tags (extra auto tags)
        if (settings.siteKeywords) {
            settings.siteKeywords.split(',').forEach(function(t) {
                if (t && t.trim()) tagSet.add(t.trim());
            });
        }
        if (settings.storeName) {
            tagSet.add(settings.storeName.trim());
        }

        // Filter and return as clean array
        var result = [];
        tagSet.forEach(function(item) {
            if (item && item.length > 1) {
                result.push(item);
            }
        });

        return result;
    }

    /**
     * Process Image File on User Device before upload
     * @param {File} file - Original user-selected file
     * @param {Object} opts - { productName, categoryNames, productTags, variantName, index, customDesc }
     * @returns {Promise<{file: File, seoTags: string[], seoFilename: string, metadata: Object}>}
     */
    function processImage(file, opts) {
        return new Promise(function(resolve) {
            if (!file) {
                resolve({ file: file, seoTags: [], seoFilename: 'image.jpg' });
                return;
            }

            opts = opts || {};
            var settings = getStoreSettings();
            var mergedTags = buildMergedTags(opts);
            var tagsString = mergedTags.join('; '); // Semicolon-separated tags for Windows / IPTC

            var prodName = (opts.productName || 'product').trim();
            var variantName = (opts.variantName || '').trim();
            var index = opts.index || 1;
            var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            if (ext === 'jpeg') ext = 'jpg';

            // Generate clean SEO Filename
            // e.g.: "mens-leather-wallet-black-1.jpg"
            var parts = [slugify(prodName)];
            if (variantName) parts.push(slugify(variantName));
            if (index > 1 || !variantName) parts.push(String(index));
            var seoFilename = parts.join('-') + '.' + ext;

            var title = prodName + (variantName ? ' - ' + variantName : '');
            var description = opts.customDesc || (title + ' — Buy online at best price from ' + settings.storeName + '. Cash on delivery available in Bangladesh.');
            var copyright = 'Copyright © ' + new Date().getFullYear() + ' ' + settings.storeName + '. All rights reserved.';
            var subject = (Array.isArray(opts.categoryNames) && opts.categoryNames[0]) || prodName;

            var metadataInfo = {
                title: title,
                tags: mergedTags,
                author: settings.storeName,
                copyright: copyright,
                description: description,
                subject: subject
            };

            // If piexifjs is available and file is JPEG, inject EXIF
            if (typeof window.piexif !== 'undefined' && (file.type === 'image/jpeg' || file.type === 'image/jpg')) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        var dataUrl = e.target.result;
                        var zeroth = {};
                        var exif = {};
                        var gps = {};

                        // Standard ASCII Tags
                        zeroth[piexif.ImageIFD.ImageDescription] = description.slice(0, 300);
                        zeroth[piexif.ImageIFD.Make] = settings.storeName.slice(0, 50);
                        zeroth[piexif.ImageIFD.Model] = title.slice(0, 100);
                        zeroth[piexif.ImageIFD.Software] = settings.storeName + ' SEO Engine';
                        zeroth[piexif.ImageIFD.Artist] = settings.storeName.slice(0, 100);
                        zeroth[piexif.ImageIFD.Copyright] = copyright.slice(0, 150);

                        // Windows & Google XP Tags (UTF-16LE Byte Arrays)
                        zeroth[piexif.ImageIFD.XPTitle] = strToUtf16LEBytes(title);
                        zeroth[piexif.ImageIFD.XPKeywords] = strToUtf16LEBytes(tagsString); // This is the KEYWORD TAGS in photo details!
                        zeroth[piexif.ImageIFD.XPComment] = strToUtf16LEBytes(description);
                        zeroth[piexif.ImageIFD.XPAuthor] = strToUtf16LEBytes(settings.storeName);
                        zeroth[piexif.ImageIFD.XPSubject] = strToUtf16LEBytes(subject);

                        var exifObj = { "0th": zeroth, "Exif": exif, "GPS": gps };
                        var exifBytes = piexif.dump(exifObj);
                        var newJpegDataUrl = piexif.insert(exifBytes, dataUrl);

                        var taggedFile = dataURLtoFile(newJpegDataUrl, seoFilename);
                        resolve({
                            file: taggedFile,
                            seoTags: mergedTags,
                            seoFilename: seoFilename,
                            metadata: metadataInfo,
                            injected: true
                        });
                        return;
                    } catch(err) {
                        console.warn('EXIF injection failed, falling back to SEO file rename:', err);
                        // Fallback: Return renamed file with SEO name
                        var renamedFile = new File([file], seoFilename, { type: file.type });
                        resolve({
                            file: renamedFile,
                            seoTags: mergedTags,
                            seoFilename: seoFilename,
                            metadata: metadataInfo,
                            injected: false
                        });
                    }
                };
                reader.onerror = function() {
                    var fallbackFile = new File([file], seoFilename, { type: file.type });
                    resolve({ file: fallbackFile, seoTags: mergedTags, seoFilename: seoFilename, metadata: metadataInfo, injected: false });
                };
                reader.readAsDataURL(file);
            } else if (file.type === 'image/png' || file.type === 'image/webp') {
                // For PNG / WebP, we can optionally convert to JPEG with full EXIF or rename with SEO slug
                // Renaming file with SEO slug guarantees SEO-friendly URL on R2/ImgBB
                var renamedFile = new File([file], seoFilename, { type: file.type });
                resolve({
                    file: renamedFile,
                    seoTags: mergedTags,
                    seoFilename: seoFilename,
                    metadata: metadataInfo,
                    injected: false
                });
            } else {
                var generalFile = new File([file], seoFilename, { type: file.type });
                resolve({
                    file: generalFile,
                    seoTags: mergedTags,
                    seoFilename: seoFilename,
                    metadata: metadataInfo,
                    injected: false
                });
            }
        });
    }

    return {
        processImage: processImage,
        buildMergedTags: buildMergedTags,
        slugify: slugify,
        getStoreSettings: getStoreSettings
    };
})();
