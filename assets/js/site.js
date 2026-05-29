/* ================================================================
   Checkrace — shared site chrome (header, footer, i18n, nav)
   Renders header+footer into #cr-header / #cr-footer.
   Bilingual: elements carry data-th / data-en (and data-th-ph / data-en-ph).
   Language stored in localStorage 'cr_lang' (default 'th').
   ================================================================ */
(function(){
  var LANG_KEY='cr_lang';
  var lang=localStorage.getItem(LANG_KEY)||'th';

  var NAV=[
    {href:'/',           th:'หน้าแรก',     en:'Home',      page:'home'},
    {href:'/services.html', th:'บริการ',    en:'Services',  page:'services'},
    {href:'/packages.html', th:'แพ็คเกจ',   en:'Packages',  page:'packages'},
    {href:'/portfolio.html',th:'ผลงาน',     en:'Portfolio', page:'portfolio'},
    {href:'/results.html',  th:'ผลการแข่งขัน',en:'Results',  page:'results'},
    {href:'/records.html',  th:'สถิตินักวิ่ง',en:'Records',  page:'records'},
    {href:'/contact.html',  th:'ติดต่อ',     en:'Contact',   page:'contact'}
  ];

  function t(o){return lang==='en'?o.en:o.th;}

  function renderHeader(active){
    var links=NAV.map(function(n){
      return '<li><a href="'+n.href+'"'+(n.page===active?' class="active"':'')+
             ' data-th="'+n.th+'" data-en="'+n.en+'">'+t(n)+'</a></li>';
    }).join('');
    return ''+
    '<header class="site-header"><div class="container nav">'+
      '<a class="nav-logo" href="/"><img src="/assets/images/logo.svg" alt="Checkrace"></a>'+
      '<button class="nav-toggle" aria-label="Menu"><span></span><span></span><span></span></button>'+
      '<ul class="nav-links" id="navLinks">'+links+'</ul>'+
      '<div class="nav-right">'+
        '<div class="lang-toggle">'+
          '<button data-lang="th"'+(lang==='th'?' class="active"':'')+'>TH</button>'+
          '<button data-lang="en"'+(lang==='en'?' class="active"':'')+'>EN</button>'+
        '</div>'+
        '<a class="btn btn-primary" href="/contact.html" data-th="ขอใบเสนอราคา" data-en="Get a quote">'+
          (lang==='en'?'Get a quote':'ขอใบเสนอราคา')+'</a>'+
      '</div>'+
    '</div></header>';
  }

  function renderFooter(){
    var y=new Date().getFullYear();
    return ''+
    '<footer class="site-footer"><div class="container">'+
      '<div class="footer-grid">'+
        '<div><div class="footer-logo"><img src="/assets/images/logo.svg" alt="Checkrace"></div>'+
          '<p data-th="แพลตฟอร์มครบวงจรสำหรับจัดงานวิ่งในประเทศไทย ตั้งแต่ระบบลงทะเบียน จับเวลา ไปจนถึงผลิตเสื้อ เหรียญ และ PR" '+
             'data-en="Thailand’s all-in-one running solution platform — from registration and timing to apparel, medals and PR.">'+
             (lang==='en'?'Thailand’s all-in-one running solution platform — from registration and timing to apparel, medals and PR.':'แพลตฟอร์มครบวงจรสำหรับจัดงานวิ่งในประเทศไทย ตั้งแต่ระบบลงทะเบียน จับเวลา ไปจนถึงผลิตเสื้อ เหรียญ และ PR')+'</p></div>'+
        '<div><h4 data-th="บริการ" data-en="Services">'+(lang==='en'?'Services':'บริการ')+'</h4>'+
          '<a href="/services.html" data-th="ระบบลงทะเบียน" data-en="Registration">'+(lang==='en'?'Registration':'ระบบลงทะเบียน')+'</a>'+
          '<a href="/services.html" data-th="ระบบจับเวลา" data-en="Timing">'+(lang==='en'?'Timing':'ระบบจับเวลา')+'</a>'+
          '<a href="/services.html" data-th="ระบบภาพถ่าย" data-en="Photo system">'+(lang==='en'?'Photo system':'ระบบภาพถ่าย')+'</a>'+
          '<a href="/services.html" data-th="เสื้อ & เหรียญ" data-en="Apparel & Medals">'+(lang==='en'?'Apparel & Medals':'เสื้อ & เหรียญ')+'</a></div>'+
        '<div><h4 data-th="ข้อมูล" data-en="Explore">'+(lang==='en'?'Explore':'ข้อมูล')+'</h4>'+
          '<a href="/packages.html" data-th="แพ็คเกจ" data-en="Packages">'+(lang==='en'?'Packages':'แพ็คเกจ')+'</a>'+
          '<a href="/portfolio.html" data-th="ผลงาน" data-en="Portfolio">'+(lang==='en'?'Portfolio':'ผลงาน')+'</a>'+
          '<a href="/results.html" data-th="ผลการแข่งขัน" data-en="Results">'+(lang==='en'?'Results':'ผลการแข่งขัน')+'</a>'+
          '<a href="/records.html" data-th="สถิตินักวิ่ง" data-en="Runner records">'+(lang==='en'?'Runner records':'สถิตินักวิ่ง')+'</a></div>'+
        '<div><h4 data-th="ติดต่อ" data-en="Contact">'+(lang==='en'?'Contact':'ติดต่อ')+'</h4>'+
          '<a href="mailto:info@checkrace.com">info@checkrace.com</a>'+
          '<a href="tel:0610104669">061-010-4669</a>'+
          '<a href="https://line.me/R/ti/p/@checkrace">LINE @checkrace</a></div>'+
      '</div>'+
      '<div class="footer-bottom"><span>© '+y+' Checkrace · Race Up Work Co., Ltd.</span>'+
        '<span>Running Solution Platform</span></div>'+
    '</div></footer>';
  }

  function applyLang(){
    document.documentElement.lang=lang;
    document.querySelectorAll('[data-th]').forEach(function(el){
      var v=el.getAttribute('data-'+lang);
      if(v!=null){ if(el.dataset.html!=null) el.innerHTML=v; else el.textContent=v; }
    });
    document.querySelectorAll('[data-th-ph]').forEach(function(el){
      var v=el.getAttribute('data-'+lang+'-ph'); if(v!=null) el.placeholder=v;
    });
    document.querySelectorAll('.lang-toggle button').forEach(function(b){
      b.classList.toggle('active',b.dataset.lang===lang);
    });
    document.dispatchEvent(new CustomEvent('cr:langchange',{detail:{lang:lang}}));
  }
  window.CR={get lang(){return lang;}};

  function wire(){
    var tog=document.querySelector('.nav-toggle'),
        links=document.getElementById('navLinks');
    if(tog) tog.addEventListener('click',function(){links.classList.toggle('open');});
    document.querySelectorAll('.lang-toggle button').forEach(function(b){
      b.addEventListener('click',function(){
        lang=b.dataset.lang; localStorage.setItem(LANG_KEY,lang); applyLang();
      });
    });
    // scroll reveal
    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(es){
        es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
      },{threshold:.12});
      document.querySelectorAll('.fade-up').forEach(function(el){io.observe(el);});
    } else {
      document.querySelectorAll('.fade-up').forEach(function(el){el.classList.add('in');});
    }
  }

  document.addEventListener('DOMContentLoaded',function(){
    var active=document.body.getAttribute('data-page')||'';
    var h=document.getElementById('cr-header'); if(h) h.innerHTML=renderHeader(active);
    var f=document.getElementById('cr-footer'); if(f) f.innerHTML=renderFooter();
    applyLang(); wire();
  });
})();
