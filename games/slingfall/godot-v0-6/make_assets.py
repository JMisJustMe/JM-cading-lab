from pathlib import Path
from xml.etree import ElementTree as ET
p=Path(__file__).parent/'assets'
base='''<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#1a353b"/><stop offset="1" stop-color="#071b24"/></linearGradient><linearGradient id="steel" x2="0" y2="1"><stop stop-color="{steel}"/><stop offset="1" stop-color="#253e49"/></linearGradient></defs>
<rect width="256" height="256" fill="url(#bg)"/>
<path d="M0 220 L80 190 L148 212 L256 159 V256 H0" fill="#325354" opacity=".55"/>
<circle cx="128" cy="97" r="84" fill="{accent}" opacity=".10"/>
<path d="M20 38 L20 18 L79 18 M236 217 L236 237 L176 237" stroke="{accent}" fill="none" stroke-width="6"/>
{shape}
<rect x="8" y="215" width="240" height="30" rx="5" fill="#06131b" opacity=".88"/>
<text x="128" y="236" text-anchor="middle" font-family="DejaVu Sans,Arial,sans-serif" font-size="18" font-weight="bold" fill="{accent}" letter-spacing="1">{title}</text>
</svg>'''
shapes={
'bulwark':('BULWARK','#64eed0','#9fa8a0','''
<path d="M62 191 Q38 137 57 108 L83 82 L173 82 L201 108 Q218 141 193 191 Z" fill="#233f49" stroke="#a0aa9c" stroke-width="6"/>
<path d="M93 109 L119 88 L157 100 L165 151 L144 189 L90 177 Z" fill="url(#steel)" stroke="#d5d2ad" stroke-width="6"/>
<path d="M37 117 L87 105 L80 186 L42 184 Z M177 105 L219 117 L213 185 L178 183 Z" fill="#87948d" stroke="#203640" stroke-width="6"/>
<path d="M99 68 L117 48 L150 51 L166 74 L157 110 L96 110 Z" fill="#2c404b" stroke="#bcc4b6" stroke-width="6"/>
<path d="M108 76 H153 L147 89 H110 Z" fill="#74ffe2"/>
<path d="M118 121 L143 118 L151 151 L131 172 L111 150 Z" fill="#194d54" stroke="#75ffe2" stroke-width="5"/>
<circle cx="130" cy="142" r="13" fill="#8ffce0"/>
<path d="M39 120 L20 149 L47 169 L73 132 Z" fill="#b6ac93" stroke="#223441" stroke-width="6"/>
<path d="M193 120 L225 144 L212 178 L182 134 Z" fill="#b6ac93" stroke="#223441" stroke-width="6"/>
'''),
'dart':('DART','#e0f7be','#4b9693','''
<path d="M92 149 L71 210 L119 186 L135 131 L165 206 L186 189 L159 108 Z" fill="#348b7e" opacity=".8"/>
<path d="M126 19 L176 97 L166 164 L130 195 L89 164 L81 94 Z" fill="#2b6267" stroke="#aeecd4" stroke-width="6"/>
<path d="M128 34 L157 94 L130 115 L96 90 Z" fill="#d2d9b6"/>
<path d="M128 50 L146 90 L129 101 L108 90 Z" fill="#132a34"/>
<path d="M96 104 Q126 114 163 103 L154 136 L108 137 Z" fill="#0d2a35"/>
<path d="M102 116 H157" stroke="#86f9d6" stroke-width="5"/>
<path d="M87 134 L65 167 M171 132 L199 164" stroke="#9bced0" stroke-width="13"/>
<path d="M58 171 L28 200 L40 151 L72 128 Z" fill="#e1c28d" stroke="#ffffff" stroke-width="3"/>
<path d="M204 170 L226 201 L219 143 L184 129 Z" fill="#e1c28d" stroke="#ffffff" stroke-width="3"/>
<path d="M115 149 L119 177 L139 174 L149 148" stroke="#a4fbe2" stroke-width="5" fill="none"/>
'''),
'warden':('WARDEN','#b6e3fa','#aab7bf','''
<path d="M58 195 L75 90 L103 69 L163 68 L183 97 L196 196 L134 211 Z" fill="#597887" stroke="#a5cdd1" stroke-width="6"/>
<path d="M116 47 Q148 20 172 61 L174 106 L90 107 L91 70 Z" fill="#93a9a9" stroke="#d7d3b7" stroke-width="6"/>
<path d="M101 78 Q128 59 158 77 L155 105 L104 105 Z" fill="#203942"/>
<path d="M109 89 H148" stroke="#dcf6f2" stroke-width="6"/>
<path d="M100 118 L149 120 L158 173 L86 172 Z" fill="#294e57"/>
<circle cx="127" cy="148" r="18" fill="#b1e7ee"/>
<path d="M116 148 H139 M127 135 V160" stroke="#27434a" stroke-width="8"/>
<path d="M33 68 L43 199" stroke="#e9d1a8" stroke-width="12"/>
<circle cx="29" cy="56" r="21" fill="#69cde2" opacity=".45" stroke="#eafbf1" stroke-width="5"/>
<circle cx="204" cy="135" r="41" fill="#a5f0e9" opacity=".3" stroke="#d7f8e5" stroke-width="7"/>
<path d="M185 135 H223 M204 116 V154" stroke="#ecfdef" stroke-width="8"/>
''')
}
for name,(title,accent,steel,shape) in shapes.items():
    svg=base.format(title=title,accent=accent,steel=steel,shape=shape)
    ET.fromstring(svg)
    (p/(name+'.svg')).write_text(svg)
print('Wrote',len(shapes),'SVG character portraits')
