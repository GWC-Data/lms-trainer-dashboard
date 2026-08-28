/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./src/**/*.{html,js,ts,tsx}"],
	
  theme: {
  	extend: {
		fontFamily: {
			poppins: ["Poppins", "ans-serif"],
		  },
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
			light: {
			background: "#f8f9fa", // Light background
			text: "#212529", // Dark text for light mode
			accent: "#0d6efd", // Accent color for buttons/links
			},
			'custom-dark': '#DDC3E7', 
			'baby-powder': '#EBCFF2',
			orange: {
			  50: '#FDF7F5',
			  100: '#FBECE7',
			  200: '#F5D1C4',
			  300: '#EEAF9C',
			  400: '#E78D71',
			  500: '#DE896A',
			  600: '#D47A5A',
			  700: '#DE896A', // Overall theme background color
			  800: '#DE896A', // User requested the exact theme color for text
			  900: '#C26D4D',
			  950: '#8A442E',
			},
			
  		},
		  backgroundImage: {
            'custom-gradient': 'linear-gradient(to right, #50bc8e, #3fa7d2, #4e6db4)',
			'custom-gradient-btn': 'linear-gradient(to left, #50bc8e, #3fa7d2, #4e6db4)',
			'settings-gradient': 'linear-gradient(90deg, rgba(158,197,243,1) 13%, rgba(253,237,192,1) 65%)'
          },
  	}
  },
  plugins: [require("tailwindcss-animate")],
}