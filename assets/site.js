/* ============================================================
   AIP — shared site behavior
   Requires assets/data.js (+ assets/photos.js for card photos).
   ============================================================ */
(function(){
  const C = window.AIP.config, M = window.AIP.meta, ROWS = window.AIP.members;
  const PHOTOS = window.AIP_PHOTOS || {};
  const $ = (s, el) => (el||document).querySelector(s);
  const $$ = (s, el) => Array.from((el||document).querySelectorAll(s));
  const fmt$ = n => "$" + n.toLocaleString("en-US");
  const STATES = {AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming"};

  /* ---------- shared header & footer ---------- */
  const page = document.body.dataset.page || "";
  const nav = [
    ["index.html","Home","home"],
    ["the-money.html","The Money","money"],
    ["the-case.html","The Case","case"],
    ["receipts.html","Receipts","receipts"],
    ["about.html","About","about"]
  ];
  const header = document.createElement("header");
  header.className = "site";
  header.innerHTML = `<div class="wrap navbar">
    <a class="logo" href="index.html" style="display:flex;align-items:center;gap:10px"><img src="assets/logo-mark.png" alt="" style="width:34px;height:34px">AIP<b>.</b>ACTION</a>
    <button id="navToggle" aria-label="Menu">&#9776;</button>
    <nav class="main" id="mainNav">
      ${nav.map(n=>`<a href="${n[0]}" class="${page===n[2]?"on":""}">${n[1]}</a>`).join("")}
      <a href="take-action.html" class="cta ${page==="act"?"on":""}">Take Action</a>
    </nav>
  </div>`;
  document.body.prepend(header);
  $("#navToggle").addEventListener("click", ()=> $("#mainNav").classList.toggle("open"));

  const footer = document.createElement("footer");
  footer.className = "site";
  footer.innerHTML = `<div class="wrap cols">
    <div>
      <div class="fLogo">AIP<b>.</b>ACTION</div>
      <p style="max-width:340px;margin-top:10px">${C.orgName}. America first. No foreign aid, no foreign lobbies, no exceptions. We follow the money so you don't have to.</p>
      <div class="socialrow">
        <a href="${C.xUrl}" target="_blank" rel="noopener">X</a>
        <a href="${C.igUrl}" target="_blank" rel="noopener">Instagram</a>
        <a href="${C.ttUrl}" target="_blank" rel="noopener">TikTok</a>
      </div>
    </div>
    <div>
      <p><a href="the-money.html">The Money Database</a></p>
      <p><a href="the-case.html">The Case</a></p>
      <p><a href="receipts.html">Receipts</a></p>
      <p><a href="take-action.html">Take Action</a></p>
      <p><a href="mailto:${C.email}">${C.email}</a></p>
    </div>
    <div style="max-width:320px">
      <p>Money figures are compiled from <a href="${M.sourceUrl}" target="_blank" rel="noopener">Federal Election Commission</a> filings (as of ${M.asOf}). AIP challenges policy and money in politics, never any people or faith.</p>
      <p style="margin-top:10px">&copy; ${new Date().getFullYear()} ${C.orgName} &middot; ${C.domain}</p>
    </div>
  </div>`;
  document.body.append(footer);

  /* ---------- email capture ---------- */
  $$("form.subscribe").forEach(f=>{
    if (C.beehiivEmbedUrl){
      // swap the form for beehiiv's official embed
      const ifr = document.createElement("iframe");
      ifr.src = C.beehiivEmbedUrl;
      ifr.style.cssText = "width:100%;max-width:560px;height:58px;border:0;background:transparent;margin-top:24px";
      ifr.title = "Subscribe";
      f.replaceWith(ifr);
    }
    else if (C.newsletterAction){ f.action = C.newsletterAction; f.method = "post"; }
    else f.addEventListener("submit", e=>{
      e.preventDefault();
      const em = f.querySelector("input[type=email]").value;
      location.href = `mailto:${C.email}?subject=Subscribe&body=Add ${encodeURIComponent(em)} to the AIP list.`;
    });
  });

  /* ---------- donate buttons ---------- */
  $$("[data-donate]").forEach(a=>{
    if (C.donateUrl){ a.href = C.donateUrl; a.target = "_blank"; }
    else a.addEventListener("click", e=>{ e.preventDefault(); alert("Donations are launching soon. Join the email list and we'll tell you first."); });
  });

  /* ---------- data helpers ---------- */
  const enriched = ROWS.map((r,i)=>({
    name:r[0], party:r[1], state:r[2], seat:r[3], amount:r[4], clean:r[5]===1, idx:i
  }));
  const ranked = enriched.filter(m=>typeof m.amount === "number")
    .slice().sort((a,b)=>b.amount-a.amount);
  ranked.forEach((m,i)=> m.rank = i+1);
  window.AIP.enriched = enriched;

  /* ---------- homepage top-10 ---------- */
  const topEl = $("#topTen");
  if (topEl){
    topEl.innerHTML = ranked.slice(0,10).map(m=>`
      <tr>
        <td class="rank">#${m.rank}</td>
        <td><strong>${m.name}</strong></td>
        <td><span class="tag ${m.party.toLowerCase()}">${m.party}</span> ${m.seat==="SEN" ? m.state+" · Senate" : m.seat}</td>
        <td class="amt hot">${fmt$(m.amount)}</td>
      </tr>`).join("");
    const t = $("#dbCount"); if (t) t.textContent = enriched.length;
  }

  /* ---------- database page ---------- */
  const dbBody = $("#dbBody");
  if (dbBody){
  const q = $("#q"), fParty = $("#fParty"), fState = $("#fState"), fSeat = $("#fSeat");
  const states = [...new Set(enriched.map(m=>m.state))].sort();
  fState.innerHTML = `<option value="">All states</option>` + states.map(s=>`<option>${s}</option>`).join("");

  let sortKey = "amount", sortDir = -1, shown = 50;
  const seatLabel = m => m.seat==="SEN" ? m.state+" · Senate" : m.seat;

  function current(){
    let list = enriched.filter(m=>{
      if (q.value && !(m.name.toLowerCase().includes(q.value.toLowerCase()) || m.state.toLowerCase()===q.value.toLowerCase() || m.seat.toLowerCase().includes(q.value.toLowerCase()))) return false;
      if (fParty.value && m.party!==fParty.value) return false;
      if (fState.value && m.state!==fState.value) return false;
      if (fSeat.value==="SEN" && m.seat!=="SEN") return false;
      if (fSeat.value==="HOUSE" && m.seat==="SEN") return false;
      return true;
    });
    list.sort((a,b)=>{
      let va=a[sortKey], vb=b[sortKey];
      if (sortKey==="amount"){ va = (va===null?-1:va); vb = (vb===null?-1:vb); return (va-vb)*sortDir; }
      return String(va).localeCompare(String(vb))*sortDir;
    });
    return list;
  }

  function render(){
    const list = current();
    $("#dbShown").textContent = Math.min(shown, list.length);
    $("#dbTotal").textContent = list.length;
    dbBody.innerHTML = list.slice(0, shown).map(m=>{
      let amtCell;
      if (m.amount===null) amtCell = `<td class="amt dim">not listed</td>`;
      else if (m.amount===0) amtCell = `<td class="amt zero">$0${m.clean?` <span class="tag clean">refuses lobby $</span>`:""}</td>`;
      else amtCell = `<td class="amt ${m.amount>=500000?"hot":""}">${fmt$(m.amount)}</td>`;
      return `<tr>
        <td class="rank">${m.rank?("#"+m.rank):"–"}</td>
        <td><strong>${m.name}</strong></td>
        <td><span class="tag ${m.party.toLowerCase()}">${m.party}</span></td>
        <td>${seatLabel(m)}</td>
        ${amtCell}
        <td><button class="btn small ghost" data-card="${m.idx}">Card</button></td>
      </tr>`;
    }).join("");
    $("#loadMore").style.display = list.length>shown ? "block" : "none";
  }

  [q,fParty,fState,fSeat].forEach(el=> el.addEventListener("input", ()=>{ shown=50; render(); }));
  $("#loadMore").addEventListener("click", ()=>{ shown+=100; render(); });
  $$("th[data-sort]").forEach(th=> th.addEventListener("click", ()=>{
    const k = th.dataset.sort;
    if (sortKey===k) sortDir*=-1; else { sortKey=k; sortDir = k==="amount"?-1:1; }
    $$("th .arrow").forEach(a=>a.remove());
    th.insertAdjacentHTML("beforeend", `<span class="arrow"> ${sortDir===1?"▲":"▼"}</span>`);
    render();
  }));
  render();
  } // end database table

  if (!$("#cardCanvas")) return;

  /* ============================================================
     SHARE-CARD GENERATOR — matches the AIP card template:
     2160×2160, B&W photo left with fade, logo top-right, accent
     bar + condensed name, seat lines, big red/green amount with
     underline, "RECEIVED FROM THE ISRAELI WAR LOBBY", @handle,
     source line, PAC disclaimer footer.
     ============================================================ */
  const modal = $("#cardModal"), canvas = $("#cardCanvas"), ctx = canvas.getContext("2d");
  const W = 2160, H = 2160;
  // AIP Action Design System tokens (tokens/colors.css)
  const RED = "#EF1E20", RED_BLOOD = "#A3121C", GREEN = "#23C55E", GREEN_FOREST = "#0C6E33";
  const INK = "#FFFFFF", GRAY = "#D7DADF", DIM = "#9AA0A8", META = "#5C626B", BG = "#08090C";
  const FONT_D = "Anton, 'Arial Narrow', sans-serif";       // display: names, numbers, handle
  const FONT_C = "Oswald, 'Arial Narrow', sans-serif";      // condensed: labels, captions
  const X0 = 1090, X1 = 2072;   // right column bounds

  const logoImg = new Image();
  let logoOK = false;
  logoImg.onload = ()=> logoOK = true;
  logoImg.src = "assets/logo-mark.png";
  const flagImg = new Image();
  let flagOK = false;
  flagImg.onload = ()=> flagOK = true;
  flagImg.src = "assets/flag-ground.png";

  document.addEventListener("click", e=>{
    const b = e.target.closest("[data-card]");
    if (b){ modal.classList.add("open"); drawCard(enriched[+b.dataset.card]); }
    if (e.target.dataset.close!==undefined || e.target===modal) modal.classList.remove("open");
  });
  $("#dlCard").addEventListener("click", ()=>{
    const a = document.createElement("a");
    a.download = ($("#cardName").value||"aip-card")+".png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  });

  function loadPhoto(m){
    const rec = PHOTOS[`${m.name}|${m.state}|${m.seat}`];
    if (!rec) return Promise.resolve(null);
    const tryUrl = url => new Promise(res=>{
      const img = new Image();
      img.crossOrigin = "anonymous";
      const t = setTimeout(()=>res(null), 6000);
      img.onload = ()=>{ clearTimeout(t); res(img); };
      img.onerror = ()=>{ clearTimeout(t); res(null); };
      img.src = url;
    });
    const id = rec[0];
    return tryUrl(`https://unitedstates.github.io/images/congress/original/${id}.jpg`)
      .then(img => img || tryUrl(`https://unitedstates.github.io/images/congress/450x550/${id}.jpg`));
  }

  /* Cool B&W duotone per the design system: luminance mapped from
     --photo-shadow #04050A to --photo-highlight #E9ECF1. */
  function duotone(img, sx, sy, sw, sh, dw, dh){
    const off = document.createElement("canvas");
    off.width = dw; off.height = dh;
    const octx = off.getContext("2d");
    octx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
    try{
      const d = octx.getImageData(0, 0, dw, dh), p = d.data;
      const S = [4,5,10], HL = [233,236,241];   // #04050A → #E9ECF1
      for (let i=0; i<p.length; i+=4){
        let l = (0.2126*p[i] + 0.7152*p[i+1] + 0.0722*p[i+2]) / 255;
        l = Math.min(1, Math.max(0, (l - 0.5) * 1.18 + 0.46));   // gentle contrast, slightly darker
        p[i]   = S[0] + (HL[0]-S[0])*l;
        p[i+1] = S[1] + (HL[1]-S[1])*l;
        p[i+2] = S[2] + (HL[2]-S[2])*l;
      }
      octx.putImageData(d, 0, 0);
    }catch(e){ /* CORS-tainted fallback: leave as-is */ }
    return off;
  }

  function roundAmount(n){
    // Round DOWN (never overstate) and mark with a superscript plus.
    let step = 0;
    if (n >= 1e6) step = 1e5; else if (n >= 1e5) step = 1e4; else if (n >= 1e4) step = 1e3;
    if (!step) return { text: fmt$(n), plus: false };
    const r = Math.floor(n/step)*step;
    return { text: fmt$(r), plus: r < n };
  }

  function fitFont(text, maxW, px, weight, family){
    ctx.font = `${weight} ${px}px ${family}`;
    while (ctx.measureText(text).width > maxW && px > 24){ px -= 4; ctx.font = `${weight} ${px}px ${family}`; }
    return px;
  }

  function wrapName(name, maxW, px){
    // Split into up to 2 balanced lines (last word(s) on line 2, like the template).
    const words = name.toUpperCase().split(" ");
    ctx.font = `400 ${px}px ${FONT_D}`;
    if (words.length===1) return [words[0]];
    for (let split = words.length-1; split >= 1; split--){
      const l1 = words.slice(0,split).join(" "), l2 = words.slice(split).join(" ");
      if (ctx.measureText(l1).width <= maxW && ctx.measureText(l2).width <= maxW) return [l1, l2];
    }
    return [words.join(" ")];
  }

  function fallbackLogo(x, y, r){
    // Placeholder mark if assets/logo.png is missing: red/blue globe + star.
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.clip();
    ctx.fillStyle = "#d92c3f"; ctx.fillRect(x-r, y-r, 2*r, 2*r);
    ctx.fillStyle = "#27408b";
    ctx.beginPath(); ctx.moveTo(x-r, y+r);
    ctx.quadraticCurveTo(x, y-r*0.4, x+r, y-r*0.55);
    ctx.lineTo(x+r, y+r); ctx.lineTo(x-r, y+r); ctx.fill();
    ctx.fillStyle = "#0c0e12";
    ctx.beginPath(); ctx.moveTo(x-r, y+r*0.25);
    ctx.quadraticCurveTo(x+r*0.2, y-r*0.15, x+r, y-r*0.75);
    ctx.quadraticCurveTo(x+r*0.1, y-r*0.35, x-r, y+r*0.05); ctx.fill();
    ctx.restore();
    // star
    ctx.fillStyle = "#0c0e12";
    ctx.save(); ctx.translate(x+r*0.45, y-r*0.45); ctx.rotate(-0.2);
    ctx.beginPath();
    for (let i=0;i<5;i++){
      const a = -Math.PI/2 + i*2*Math.PI/5, a2 = a + Math.PI/5;
      const R1 = r*0.34, R2 = r*0.14;
      ctx.lineTo(Math.cos(a)*R1, Math.sin(a)*R1);
      ctx.lineTo(Math.cos(a2)*R2, Math.sin(a2)*R2);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  async function drawCard(m){
    $("#cardName").value = "aip-"+m.name.toLowerCase().replace(/[^a-z]+/g,"-");
    try {
      await document.fonts.load("400 150px Anton");
      await document.fonts.load("600 56px Oswald");
      await document.fonts.load("italic 400 46px Oswald");
    } catch(e){}

    const zero = m.amount===0, none = m.amount===null;
    const ACC = zero ? GREEN : RED;
    const ACC_SHADOW = zero ? GREEN_FOREST : RED_BLOOD;

    // ground (--ink-black canvas)
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = BG; ctx.fillRect(0,0,W,H);

    // flag backdrop — clean/"$0" cards get the darkened flag anchored top-left, fading to black
    if (zero && flagOK){
      const s = Math.max(W/flagImg.width, 1500/flagImg.height);
      ctx.drawImage(flagImg, 0, 0, flagImg.width*s, flagImg.height*s);
      let g = ctx.createLinearGradient(0, 0, 0, 1500);
      g.addColorStop(0, "rgba(8,9,12,.45)"); g.addColorStop(1, "rgba(8,9,12,1)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, 1500);
      g = ctx.createLinearGradient(W*0.35, 0, W, 0);
      g.addColorStop(0, "rgba(8,9,12,0)"); g.addColorStop(1, "rgba(8,9,12,.85)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, 1500);
    }

    // photo — FIXED FRAME so every card matches:
    // source is cropped to exactly 9:11 (the congressional-portrait aspect),
    // drawn at a constant size and position, duotoned, then vignetted.
    const photo = await loadPhoto(m);
    if (photo){
      // deterministic 9:11 center-crop of whatever we got
      const AR = 9/11;
      let sw = photo.width, sh = photo.height;
      if (sw/sh > AR){ sw = Math.round(sh*AR); }        // too wide → crop sides
      else { sh = Math.round(sw/AR); }                   // too tall → crop bottom-weighted top keep
      const sx = Math.round((photo.width - sw)/2), sy0 = Math.round((photo.height - sh)*0.25);
      // constant destination: full-bleed height, face lands in the same spot on every card
      const dh = H, dw = Math.round(H*AR), dx = -270, dy = 0;
      const toned = duotone(photo, sx, sy0, sw, sh, Math.min(dw,1800), Math.min(dh,2200));
      ctx.drawImage(toned, dx, dy, dw, dh);
      // --gradient-vignette: fade right edge into canvas
      let g = ctx.createLinearGradient(620, 0, dx+dw, 0);
      g.addColorStop(0, "rgba(8,9,12,0)"); g.addColorStop(1, "rgba(8,9,12,1)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, dx+dw, H);
      // --gradient-floor: fade bottom
      g = ctx.createLinearGradient(0, H-700, 0, H);
      g.addColorStop(0, "rgba(8,9,12,0)"); g.addColorStop(1, "rgba(8,9,12,.96)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, dx+dw, H);
      // subtle top fade so hair doesn't hit the edge hard
      g = ctx.createLinearGradient(0, 0, 0, 160);
      g.addColorStop(0, "rgba(8,9,12,.85)"); g.addColorStop(1, "rgba(8,9,12,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, dx+dw, 160);
    }

    // logo top-right (assets/logo-mark.png — the circular emblem)
    if (logoOK){
      ctx.drawImage(logoImg, X1-250, 78, 250, 250);
    } else fallbackLogo(X1-125, 205, 125);

    // ---- FIXED GRID: every element sits at the same y on every card ----
    // name block: up to 2 lines, bottom line always at NAME_BASE
    ctx.textBaseline = "alphabetic";
    const NAME_BASE = 700;
    let namePx = 165;
    let lines = wrapName(m.name, X1-X0-10, namePx);
    while (lines.some(l=>{ ctx.font=`400 ${namePx}px ${FONT_D}`; return ctx.measureText(l).width > X1-X0-10; }) && namePx>90){
      namePx -= 6; lines = wrapName(m.name, X1-X0-10, namePx);
    }
    const lineH = namePx*1.02;   // crushed
    const nameTop = NAME_BASE - (lines.length-1)*lineH;   // bottom-anchored
    ctx.fillStyle = ACC;
    ctx.fillRect(X0-70, nameTop-namePx+14, 26, (lines.length-1)*lineH + namePx*1.0);
    ctx.fillStyle = INK;
    lines.forEach((l,i)=>{ ctx.font = `400 ${namePx}px ${FONT_D}`; ctx.fillText(l, X0, nameTop + i*lineH); });

    // seat lines (Oswald 600, letter-spaced, --gray-200) — fixed y
    const isSen = m.seat==="SEN";
    const inDataset = !!PHOTOS[`${m.name}|${m.state}|${m.seat}`];
    const role = isSen ? (inDataset ? "U.S. SENATOR" : "U.S. SENATE CANDIDATE")
                       : (inDataset ? "U.S. REPRESENTATIVE" : "U.S. HOUSE CANDIDATE");
    const distNo = !isSen && m.seat.split("-")[1];
    const line2 = STATES[m.state].toUpperCase() + (isSen ? "" : (distNo==="AL" ? " — AT LARGE" : " — DISTRICT " + parseInt(distNo,10)));
    ctx.fillStyle = GRAY;
    try{ ctx.letterSpacing = "3px"; }catch(e){}
    ctx.font = `600 56px ${FONT_C}`;
    ctx.fillText(`${role} (${m.party})`, X0, 830);
    ctx.fillText(line2, X0, 906);
    try{ ctx.letterSpacing = "0px"; }catch(e){}

    // hairline divider — fixed y
    ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.fillRect(X0, 990, X1-X0, 3);

    // amount — Anton, with the --red-blood/--green-forest kick-shadow — fixed baseline
    const amt = none ? {text:"NOT LISTED", plus:false} : zero ? {text:"$0", plus:false} : roundAmount(m.amount);
    const ay = 1300;
    let apx = fitFont(amt.text, X1-X0-(amt.plus?70:0), 265, 400, FONT_D);
    ctx.font = `400 ${apx}px ${FONT_D}`;
    if (!none){ ctx.fillStyle = ACC_SHADOW; ctx.fillText(amt.text, X0, ay+7); }
    ctx.fillStyle = none ? GRAY : ACC;
    ctx.fillText(amt.text, X0, ay);
    const aw = ctx.measureText(amt.text).width;
    if (amt.plus){
      ctx.font = `400 ${Math.round(apx*0.4)}px ${FONT_D}`;
      ctx.fillStyle = ACC_SHADOW; ctx.fillText("+", X0 + aw + 14, ay - apx*0.55 + 5);
      ctx.fillStyle = ACC; ctx.fillText("+", X0 + aw + 14, ay - apx*0.55);
    }
    // underline rule
    ctx.fillStyle = none ? "rgba(255,255,255,.25)" : ACC;
    ctx.fillRect(X0, ay+48, Math.max(aw + (amt.plus?74:0), 560), 22);

    // statement label (Oswald 700 caps)
    ctx.fillStyle = INK;
    try{ ctx.letterSpacing = "2px"; }catch(e){}
    ctx.font = `700 86px ${FONT_C}`;
    ctx.fillText("RECEIVED FROM THE", X0, ay+225);
    ctx.fillText("ISRAELI WAR LOBBY", X0, ay+330);
    try{ ctx.letterSpacing = "0px"; }catch(e){}

    // hairline divider
    ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.fillRect(X0, ay+410, X1-X0, 3);

    // handle (Anton, wide tracking) + italic source caption, right-aligned
    ctx.textAlign = "right";
    ctx.fillStyle = INK;
    try{ ctx.letterSpacing = "7px"; }catch(e){}
    ctx.font = `400 78px ${FONT_D}`;
    ctx.fillText(C.handle, X1, ay+545);
    try{ ctx.letterSpacing = "0px"; }catch(e){}
    ctx.fillStyle = DIM; ctx.font = `italic 400 46px ${FONT_C}`;
    ctx.fillText(C.cardSourceLine, X1, ay+635);
    ctx.textAlign = "left";

    // disclaimer footer strip
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(0, H-180, W, 180);
    ctx.fillStyle = GRAY; ctx.font = `400 42px ${FONT_C}`; ctx.textAlign = "center";
    const words = C.disclaimer.split(" ");
    let l1 = "", i = 0;
    while (i < words.length && ctx.measureText(l1 + " " + words[i]).width < W-260){ l1 += (l1?" ":"") + words[i]; i++; }
    ctx.fillText(l1, W/2, H-104);
    ctx.fillText(words.slice(i).join(" "), W/2, H-48);
    ctx.textAlign = "left";
  }

  // exposed for batch.html
  window.AIP.drawCard = drawCard;
  window.AIP.ranked = ranked;
})();
