const fs = require('fs');

let txt = fs.readFileSync('admin/settings.html', 'utf8');

const oldThemeUI = `            <!-- Theme Settings -->
            <div class="card" style="margin-bottom:20px;">
                <div class="settings-section-title"><i data-lucide="palette" class="lucide-icon"></i> Theme Customizer</div>
                
                <div class="form-group">
                    <label class="form-label">Extract Colors from Image</label>
                    <div style="font-size:12px; color:#888; margin-bottom:8px;">Upload a logo or photo to automatically generate a color palette matching your brand.</div>
                    <input type="file" id="paletteImageInput" accept="image/*" style="display:none;" onchange="extractColorsFromImage(event)">
                    <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('paletteImageInput').click()" style="width:100%; border:1px dashed var(--primary); color:var(--primary); background:rgba(255,77,77,0.05);">
                        🎨 Upload Image to Extract Palette
                    </button>
                    <div id="palettePreview" style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;"></div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Primary Color</label>
                        <div style="display:flex; gap:8px;">
                            <input type="color" id="themePrimary" value="#FF4D4D" style="width:40px; height:38px; padding:0; border:none; border-radius:6px; cursor:pointer;" onchange="updateThemePreview()">
                            <input type="text" id="themePrimaryHex" class="form-input" value="#FF4D4D" oninput="document.getElementById('themePrimary').value=this.value; updateThemePreview()">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Background (Body)</label>
                        <div style="display:flex; gap:8px;">
                            <input type="color" id="themeBgBody" value="#F4F7FE" style="width:40px; height:38px; padding:0; border:none; border-radius:6px; cursor:pointer;" onchange="updateThemePreview()">
                            <input type="text" id="themeBgBodyHex" class="form-input" value="#F4F7FE" oninput="document.getElementById('themeBgBody').value=this.value; updateThemePreview()">
                        </div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Card Background</label>
                        <div style="display:flex; gap:8px;">
                            <input type="color" id="themeBgCard" value="#FFFFFF" style="width:40px; height:38px; padding:0; border:none; border-radius:6px; cursor:pointer;" onchange="updateThemePreview()">
                            <input type="text" id="themeBgCardHex" class="form-input" value="#FFFFFF" oninput="document.getElementById('themeBgCard').value=this.value; updateThemePreview()">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Text (Dark)</label>
                        <div style="display:flex; gap:8px;">
                            <input type="color" id="themeTextDark" value="#1A1A2E" style="width:40px; height:38px; padding:0; border:none; border-radius:6px; cursor:pointer;" onchange="updateThemePreview()">
                            <input type="text" id="themeTextDarkHex" class="form-input" value="#1A1A2E" oninput="document.getElementById('themeTextDark').value=this.value; updateThemePreview()">
                        </div>
                    </div>
                </div>

                <div class="form-group" style="margin-top:16px;">
                    <label class="form-label">Live Preview</label>
                    <div id="themePreviewBox" style="padding:16px; border-radius:12px; background:#F4F7FE; border:1px solid rgba(0,0,0,0.05);">
                        <div id="themePreviewCard" style="background:#FFFFFF; padding:16px; border-radius:10px; box-shadow:0 4px 15px rgba(0,0,0,0.03);">
                            <div style="font-size:15px; font-weight:800; color:#1A1A2E; margin-bottom:12px;" id="tpTitle">Live Store Preview</div>
                            <button style="background:#FF4D4D; color:white; border:none; padding:10px 16px; border-radius:8px; font-weight:700; width:100%; cursor:pointer;" id="tpBtn">Buy Now</button>
                        </div>
                    </div>
                </div>
            </div>`;

const newThemeUI = `            <!-- Theme Settings -->
            <div class="card" style="margin-bottom:20px;">
                <div class="settings-section-title"><i data-lucide="palette" class="lucide-icon"></i> Theme Customizer (Github Deploy Hook)</div>
                <div style="font-size:11px; color:#ff9500; margin-bottom:12px; font-weight:600; padding:8px; background:rgba(255,149,0,0.1); border-radius:6px;">
                    ⚠️ Saving theme will directly edit your Github CSS file and trigger a full Cloudflare Pages Rebuild (Takes ~2-3 mins).
                </div>
                
                <div class="form-group">
                    <label class="form-label">Extract Colors from Image</label>
                    <input type="file" id="paletteImageInput" accept="image/*" style="display:none;" onchange="extractColorsFromImage(event)">
                    <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('paletteImageInput').click()" style="width:100%; border:1px dashed var(--primary); color:var(--primary); background:rgba(255,77,77,0.05);">
                        🎨 Upload Image to Extract Palette
                    </button>
                    <div id="palettePreview" style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;"></div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Navbar & Button (Primary)</label>
                        <div style="display:flex; gap:8px;">
                            <input type="color" id="themePrimary" value="#FF4D4D" style="width:40px; height:38px; padding:0; border:none; border-radius:6px; cursor:pointer;" onchange="updateThemePreview()">
                            <input type="text" id="themePrimaryHex" class="form-input" value="#FF4D4D" oninput="document.getElementById('themePrimary').value=this.value; updateThemePreview()">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Page Background</label>
                        <div style="display:flex; gap:8px;">
                            <input type="color" id="themeBgBody" value="#F4F7FE" style="width:40px; height:38px; padding:0; border:none; border-radius:6px; cursor:pointer;" onchange="updateThemePreview()">
                            <input type="text" id="themeBgBodyHex" class="form-input" value="#F4F7FE" oninput="document.getElementById('themeBgBody').value=this.value; updateThemePreview()">
                        </div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Product Card Background</label>
                        <div style="display:flex; gap:8px;">
                            <input type="color" id="themeBgCard" value="#FFFFFF" style="width:40px; height:38px; padding:0; border:none; border-radius:6px; cursor:pointer;" onchange="updateThemePreview()">
                            <input type="text" id="themeBgCardHex" class="form-input" value="#FFFFFF" oninput="document.getElementById('themeBgCard').value=this.value; updateThemePreview()">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Headings & Titles Text</label>
                        <div style="display:flex; gap:8px;">
                            <input type="color" id="themeTextDark" value="#1A1A2E" style="width:40px; height:38px; padding:0; border:none; border-radius:6px; cursor:pointer;" onchange="updateThemePreview()">
                            <input type="text" id="themeTextDarkHex" class="form-input" value="#1A1A2E" oninput="document.getElementById('themeTextDark').value=this.value; updateThemePreview()">
                        </div>
                    </div>
                </div>

                <div class="form-group" style="margin-top:16px;">
                    <label class="form-label">Advanced Live Preview</label>
                    <div id="themePreviewBox" style="padding:0; border-radius:12px; background:#F4F7FE; border:1px solid rgba(0,0,0,0.1); overflow:hidden; display:flex; flex-direction:column; height:300px;">
                        
                        <!-- Mock Navbar -->
                        <div id="tpNavbar" style="background:#FF4D4D; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
                            <div style="color:white; font-weight:800; font-size:16px;">My Store</div>
                            <div style="color:white; font-size:12px;">☰</div>
                        </div>
                        
                        <!-- Mock Content -->
                        <div style="padding:20px; flex:1;">
                            <div id="tpTitle" style="font-size:18px; font-weight:800; color:#1A1A2E; margin-bottom:12px;">Featured Products</div>
                            
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                                <!-- Mock Card 1 -->
                                <div class="tpCard" style="background:#FFFFFF; border-radius:10px; padding:10px; box-shadow:0 4px 15px rgba(0,0,0,0.03);">
                                    <div style="background:#e0e0e0; height:80px; border-radius:6px; margin-bottom:10px;"></div>
                                    <div class="tpText" style="font-size:12px; font-weight:700; color:#1A1A2E; margin-bottom:6px;">Smart Watch</div>
                                    <button class="tpBtn" style="background:#FF4D4D; color:white; border:none; padding:6px; border-radius:6px; font-weight:700; width:100%; cursor:pointer; font-size:11px;">Buy Now</button>
                                </div>
                                
                                <!-- Mock Card 2 -->
                                <div class="tpCard" style="background:#FFFFFF; border-radius:10px; padding:10px; box-shadow:0 4px 15px rgba(0,0,0,0.03);">
                                    <div style="background:#e0e0e0; height:80px; border-radius:6px; margin-bottom:10px;"></div>
                                    <div class="tpText" style="font-size:12px; font-weight:700; color:#1A1A2E; margin-bottom:6px;">Headphones</div>
                                    <button class="tpBtn" style="background:#FF4D4D; color:white; border:none; padding:6px; border-radius:6px; font-weight:700; width:100%; cursor:pointer; font-size:11px;">Buy Now</button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <button type="button" class="btn btn-primary" style="width:100%;" onclick="saveThemeToGithub()">🚀 Push Theme & Rebuild Site</button>
            </div>`;

txt = txt.replace(oldThemeUI, newThemeUI);

// Fix updateThemePreview
const oldUpdatePreview = `    function updateThemePreview() {
        var pri = document.getElementById('themePrimary').value;
        var bgB = document.getElementById('themeBgBody').value;
        var bgC = document.getElementById('themeBgCard').value;
        var txt = document.getElementById('themeTextDark').value;
        
        var box = document.getElementById('themePreviewBox');
        var card = document.getElementById('themePreviewCard');
        var title = document.getElementById('tpTitle');
        var btn = document.getElementById('tpBtn');
        
        if(box) box.style.background = bgB;
        if(card) card.style.background = bgC;
        if(title) title.style.color = txt;
        if(btn) btn.style.background = pri;
    }`;

const newUpdatePreview = `    function updateThemePreview() {
        var pri = document.getElementById('themePrimary').value;
        var bgB = document.getElementById('themeBgBody').value;
        var bgC = document.getElementById('themeBgCard').value;
        var txtCol = document.getElementById('themeTextDark').value;
        
        var box = document.getElementById('themePreviewBox');
        var nav = document.getElementById('tpNavbar');
        
        if(box) box.style.background = bgB;
        if(nav) nav.style.background = pri;
        
        document.querySelectorAll('.tpCard').forEach(c => c.style.background = bgC);
        document.querySelectorAll('.tpText').forEach(t => t.style.color = txtCol);
        var mainTitle = document.getElementById('tpTitle');
        if(mainTitle) mainTitle.style.color = txtCol;
        
        document.querySelectorAll('.tpBtn').forEach(b => b.style.background = pri);
    }
    
    function saveThemeToGithub() {
        var pri = document.getElementById('themePrimary').value;
        var bgB = document.getElementById('themeBgBody').value;
        var bgC = document.getElementById('themeBgCard').value;
        var txtCol = document.getElementById('themeTextDark').value;
        
        // CSS Generation
        var css = ":root {\\n";
        css += "  --primary: " + pri + ";\\n";
        css += "  --bg-body: " + bgB + ";\\n";
        css += "  --bg-card: " + bgC + ";\\n";
        css += "  --text-dark: " + txtCol + ";\\n";
        css += "}\\n";
        
        var btn = event.target;
        btn.textContent = "⏳ Triggering Rebuild...";
        btn.disabled = true;
        
        fetch((CONFIG.HF_API_BASE ? CONFIG.HF_API_BASE.replace(/\\/+$/, '') : '') + '/api/admin/update-theme', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + (localStorage.getItem('admin_token') || '')
            },
            body: JSON.stringify({ css_payload: css })
        })
        .then(r => r.json())
        .then(data => {
            if(data.success) {
                showToast("✅ Github Rebuild Triggered! It will take 2-3 mins to go live.", "success");
            } else {
                showToast("❌ Error: " + data.error, "error");
            }
        })
        .catch(err => {
            showToast("❌ Network Error: " + err.message, "error");
        })
        .finally(() => {
            btn.textContent = "🚀 Push Theme & Rebuild Site";
            btn.disabled = false;
        });
    }`;

txt = txt.replace(oldUpdatePreview, newUpdatePreview);

fs.writeFileSync('admin/settings.html', txt);
