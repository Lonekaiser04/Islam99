// Theme Toggle
        const themeToggle = document.getElementById('themeToggle');
        const mobileThemeToggle = document.getElementById('mobileThemeToggle');
        const body = document.body;
        
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            body.classList.add('dark-mode');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            mobileThemeToggle.innerHTML = '<i class="fas fa-sun"></i> Toggle Theme';
        }
        
        function toggleTheme() {
            body.classList.toggle('dark-mode');
            
            if (body.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                mobileThemeToggle.innerHTML = '<i class="fas fa-sun"></i> Toggle Theme';
            } else {
                localStorage.setItem('theme', 'light');
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                mobileThemeToggle.innerHTML = '<i class="fas fa-moon"></i> Toggle Theme';
            }
        }
        
        themeToggle.addEventListener('click', toggleTheme);
        mobileThemeToggle.addEventListener('click', toggleTheme);
        
        // Mobile Navigation
        const navToggle = document.getElementById('navToggle');
        const mobileNav = document.getElementById('mobileNav');
        const closeNav = document.getElementById('closeNav');
        
        navToggle.addEventListener('click', () => {
            mobileNav.classList.add('active');
        });
        
        closeNav.addEventListener('click', () => {
            mobileNav.classList.remove('active');
        });
        
        // Close mobile nav when clicking a link
        const mobileNavLinks = document.querySelectorAll('.mobile-nav .nav-links a');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileNav.classList.remove('active');
            });
        });
        
        // Prayer Times (via Aladhan API)
        const byCity = (city, country, method) =>
          `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
        const byCoords = (lat, lon, method) =>
          `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=${method}`;

        const $times = document.querySelector('#times tbody');
        const $where = document.getElementById('where');
        const $dateLabel = document.getElementById('dateLabel');
        const $tz = document.getElementById('tz');

        async function fetchTimes(url, label){
          try{
            // Show loading state
            $times.innerHTML = `<tr><td colspan="6" class="muted">Loading prayer times...</td></tr>`;
            
            const res = await fetch(url, {headers:{'Accept':'application/json'}});
            if(!res.ok) throw new Error('Network error');
            const data = await res.json();
            if(data.code !== 200) throw new Error('API error');
            const t = data.data.timings;
            const meta = data.data.meta;
            
            // Determine current prayer time
            const now = new Date();
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();
            const currentTime = currentHours * 60 + currentMinutes;
            
            const prayers = [
              {name: 'Fajr', time: t.Fajr},
              {name: 'Sunrise', time: t.Sunrise},
              {name: 'Dhuhr', time: t.Dhuhr},
              {name: 'Asr', time: t.Asr},
              {name: 'Maghrib', time: t.Maghrib},
              {name: 'Isha', time: t.Isha}
            ];
            
            // Convert prayer times to minutes since midnight
            const prayerTimes = prayers.map(prayer => {
              const [hours, minutes] = prayer.time.split(':').map(Number);
              return {name: prayer.name, time: prayer.time, minutes: hours * 60 + minutes};
            });
            
            // Find current prayer
            let currentPrayer = null;
            for(let i = prayerTimes.length - 1; i >= 0; i--) {
              if(currentTime >= prayerTimes[i].minutes) {
                currentPrayer = prayerTimes[i].name;
                break;
              }
            }
            if(!currentPrayer) currentPrayer = 'Fajr'; // If before Fajr, next is Fajr
            
            // Build table rows
            let tableHTML = '';
            prayers.forEach(prayer => {
              const isCurrent = prayer.name === currentPrayer;
              tableHTML += `
                <tr class="${isCurrent ? 'current-prayer' : ''}">
                  <td>${sanitizeTime(prayer.time)}</td>
                  <td>${prayer.name === 'Sunrise' ? sanitizeTime(prayer.time) : '-'}</td>
                  <td>${prayer.name === 'Dhuhr' ? sanitizeTime(prayer.time) : '-'}</td>
                  <td>${prayer.name === 'Asr' ? sanitizeTime(prayer.time) : '-'}</td>
                  <td>${prayer.name === 'Maghrib' ? sanitizeTime(prayer.time) : '-'}</td>
                  <td>${prayer.name === 'Isha' ? sanitizeTime(prayer.time) : '-'}</td>
                </tr>
              `;
            });
            
            $times.innerHTML = tableHTML;
            const gDate = data.data.date.readable;
            const hDate = data.data.date.hijri.day + ' ' + data.data.date.hijri.month.en + ' ' + data.data.date.hijri.year + ' AH';
            $dateLabel.textContent = `Date: ${gDate} • ${hDate}`;
            $tz.textContent = `TZ: ${meta.timezone}`;
            $where.textContent = `Location: ${label}`;
          }catch(err){
            console.error(err);
            $times.innerHTML = `<tr><td colspan="6" class="muted">Could not load times. Please check your input or try again later.</td></tr>`;
          }
        }

        function sanitizeTime(str){
          // Aladhan returns e.g., "05:08 (IST)"; keep HH:MM and am/pm if present
          const time = String(str).replace(/\s*\(.*?\)\s*/g,'');
          // Format time to AM/PM
          const [hours, minutes] = time.split(':').map(Number);
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const formattedHours = hours % 12 || 12;
          return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        }

        document.getElementById('btnFetch').addEventListener('click', ()=>{
          const city = document.getElementById('city').value.trim();
          const country = document.getElementById('country').value.trim();
          const method = document.getElementById('method').value;
          if(!city || !country){
            alert('Please enter both City and Country, or use "Use my location".');
            return;
          }
          fetchTimes(byCity(city, country, method), `${city}, ${country}`);
        });

        document.getElementById('btnLocate').addEventListener('click', ()=>{
          if(!('geolocation' in navigator)){
            alert('Geolocation not supported. Enter City & Country instead.');
            return;
          }
          const method = document.getElementById('method').value;
          navigator.geolocation.getCurrentPosition(
            pos=>{
              const {latitude, longitude} = pos.coords;
              fetchTimes(byCoords(latitude, longitude, method), `Your location`);
            },
            err=>{
              alert('Location permission denied or unavailable. Enter City & Country instead.');
            },
            {enableHighAccuracy:false, timeout:8000, maximumAge:600000}
          );
        });

        // Prefill country based on timezone
        (function prefill(){
          try{
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
            // Quick map for common zones to countries (not exhaustive)
            const map = {
              'Asia/Kolkata':'India','Asia/Riyadh':'Saudi Arabia','Asia/Dubai':'United Arab Emirates',
              'Europe/London':'United Kingdom','America/New_York':'USA','Asia/Jakarta':'Indonesia',
              'Africa/Cairo':'Egypt','Africa/Casablanca':'Morocco','Asia/Karachi':'Pakistan',
              'Asia/Dhaka':'Bangladesh','Asia/Kuala_Lumpur':'Malaysia','Asia/Singapore':'Singapore'
            };
            const guess = map[tz];
            if(guess){ document.getElementById('country').value = guess; }
          }catch{}
        })();
        
        // Contact form handler
        document.getElementById('contactForm').addEventListener('submit', function(e) {
          e.preventDefault();
          alert('Thank you for your message! In a real application, this would be sent to the server.');
          this.reset();
        });