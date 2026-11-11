window.TAURON_PROJECT={
  "case": {
    "slug": "tauron-search",
    "type": "long",
    "title": "TAURON — from a customer’s words to the right service",
    "subtitle": "",
    "hero": "content/tauron/cover.webp",
    "details": [
      [
        "Keywords",
        "Product design, UX/UI, Web, Mobile"
      ],
      [
        "Role",
        "Product Designer"
      ],
      [
        "Industry",
        "Energy & Utilities"
      ],
      [
        "Visit",
        "<a href=\"https://www.tauron.pl/\" target=\"_blank\" rel=\"noopener noreferrer\">www.tauron.pl</a>"
      ]
    ],
    "blocks": [
      {
        "t": "h",
        "lvl": 3,
        "v": "Project Description"
      },
      {
        "t": "p",
        "v": "How observing the way customers already describe their needs helped us turn a request for another dropdown into a search experience that guides people to the right self-service journey."
      },
      {
        "t": "h",
        "lvl": 3,
        "v": "The problem in three numbers"
      },
      {
        "t": "html",
        "v": "<div class=\"tauron-stats\"><div class=\"detail\"><strong>40%</strong><p>Of analysed enquiries used the general contact form.</p></div><div class=\"detail\"><strong>80%</strong><p>Of those general enquiries could potentially use a more relevant service route.</p></div><div class=\"detail\"><strong>6/6</strong><p>Participants perceived search as faster. Qualitative feedback, not measured task time.</p></div></div><p class=\"note\">Sources: internal pre-launch enquiry analysis and comparative usability testing with six participants.</p>"
      },
      {
        "t": "h",
        "lvl": 3,
        "v": "The problem wasn't a lack of forms. It was finding the right one."
      },
      {
        "t": "p",
        "v": "TAURON already offers dedicated forms that allow customers to resolve many issues through self-service processes. Still, a substantial share of enquiries was being sent through the general “Contact us” form."
      },
      {
        "t": "p",
        "v": "We noticed a telling behaviour: <strong>customers used the “Describe your issue” field to write messages much like emails</strong>. They explained, in their own words, what had happened and what they needed, instead of naming an internal service category."
      },
      {
        "t": "p",
        "v": "But this information only reached the company at the end of the journey. A customer service agent then had to read the message, interpret the intent and route the issue to the right process. That created additional manual work and prolonged resolution for customers."
      },
      {
        "t": "p",
        "v": "The support and contact pages offered multiple options, and the form led people through successive layers of topics. Customers had to understand the organisation&#x27;s terminology, even though <strong>they could already articulate their problem naturally</strong>."
      },
      {
        "t": "p",
        "v": "<strong>The insight:</strong> we didn&#x27;t need to teach customers a new behaviour. We needed to use the one they already had and connect it to the right available services."
      },
      {
        "t": "img",
        "v": "content/tauron/current-desktop.webp",
        "alt": "Existing TAURON contact form with customer types and multiple service categories",
        "caption": "Before: customers need to navigate the organisation’s categories.",
        "width": 1600,
        "height": 1042,
        "mobile": false
      },
      {
        "t": "h",
        "lvl": 3,
        "v": "The search idea started with “Describe your issue”."
      },
      {
        "t": "p",
        "v": "The initial business request was to extend the contact form with another category dropdown. The aim was to help customers select the right topic and reduce the number of enquiries requiring manual handling."
      },
      {
        "t": "p",
        "v": "Looking at the data and existing journey, however, we saw something more useful than another way of categorising issues. <strong>Customers using the general form were already describing their problems in everyday language, often in the form of an email.</strong> They just did it at the very end, in a field called “Describe your issue”, when the message was about to be sent to an agent."
      },
      {
        "t": "p",
        "v": "That observation led to a different question: <strong>what if customers could describe their problem first, before navigating through category lists?</strong>"
      },
      {
        "t": "p",
        "v": "Instead of introducing another dropdown, we proposed a search feature that uses a natural-language description to suggest the relevant service form or guidance page. We weren&#x27;t trying to change how customers wanted to communicate. We changed the point in the journey at which we could help them."
      },
      {
        "t": "p",
        "v": "The direction was welcomed. We agreed to start with a pilot in the contact form and consider extending it to the main customer-support page after analysing real-world performance."
      },
      {
        "t": "html",
        "v": "<div class=\"tauron-paths\"><div class=\"detail\"><span>Existing journey</span><p>Describe the issue → send enquiry → agent interprets and routes it.</p></div><div class=\"detail\"><span>Proposed journey</span><p>Describe the issue → keyword matching → relevant form or help page.</p></div></div>"
      },
      {
        "t": "h",
        "lvl": 3,
        "v": "From the customer's words to a practical next step"
      },
      {
        "t": "p",
        "v": "I developed the interaction concept, the complete desktop and mobile designs and a working Figma Make prototype supporting real customer scenarios."
      },
      {
        "t": "p",
        "v": "Customers no longer need to know the internal taxonomy of service topics. They write what they need, and keyword-based matching suggests relevant options. Those options may lead to a dedicated request form or an explanatory help page."
      },
      {
        "t": "p",
        "v": "We designed not only the ideal search result but also ambiguous queries, no matches, technical errors and the option to return to human-assisted contact."
      },
      {
        "t": "img",
        "v": "content/tauron/results-desktop.webp",
        "alt": "TAURON desktop search concept showing a recommended online tariff-change form",
        "caption": "Pilot design: a description becomes a practical next step. Original product UI is in Polish.",
        "width": 1600,
        "height": 985,
        "mobile": false
      },
      {
        "t": "h",
        "lvl": 3,
        "v": "Four decisions that shaped the experience"
      },
      {
        "t": "h",
        "lvl": 4,
        "v": "01. Start with the customer&#x27;s words, not a category list"
      },
      {
        "t": "p",
        "v": "Instead of asking people to identify a predefined topic, we ask them to “Describe what you need in your own words”. We moved an existing behaviour from the end of the general contact journey to the beginning of the experience."
      },
      {
        "t": "h",
        "lvl": 4,
        "v": "02. Highlight a recommendation only when the match is clear"
      },
      {
        "t": "p",
        "v": "When the search mechanism identifies a likely best route, we visually highlight a “Recommended solution” while keeping alternatives available."
      },
      {
        "t": "p",
        "v": "If it cannot confidently identify a single result, we avoid presenting one as definitive. Instead, the interface asks “Is your issue one of the following?” and shows several potential topics."
      },
      {
        "t": "h",
        "lvl": 4,
        "v": "03. Set expectations before the next click"
      },
      {
        "t": "p",
        "v": "During testing of the existing form, participants were sometimes unsure where the next category selection would lead. We therefore labelled results by destination: <strong>“Załatw online” (Complete online)</strong> for a self-service process and <strong>“Poradnik” (Guide)</strong> for explanatory content."
      },
      {
        "t": "p",
        "v": "These small labels help customers decide what to open before leaving the search view."
      },
      {
        "t": "h",
        "lvl": 4,
        "v": "04. No result should not mean a dead end"
      },
      {
        "t": "p",
        "v": "I also designed the no-match and technical-error states. Customers can retry without losing their query or move to chat or the general contact form. When the general form is opened from search, the design specifies carrying over the text they have already entered."
      },
      {
        "t": "img",
        "v": "content/tauron/recommended-mobile.webp",
        "alt": "Recommended self-service result and alternative guidance",
        "caption": "Clear match: highlight a recommendation and keep alternatives.",
        "width": 670,
        "height": 1065,
        "mobile": true
      },
      {
        "t": "img",
        "v": "content/tauron/ambiguous-mobile.webp",
        "alt": "Several possible topics without a highlighted winner",
        "caption": "Ambiguous match: offer options without claiming a definitive answer.",
        "width": 713,
        "height": 985,
        "mobile": true
      },
      {
        "t": "img",
        "v": "content/tauron/no-match-mobile.webp",
        "alt": "No matching result with alternative contact options",
        "caption": "No match: keep a route to human-assisted contact.",
        "width": 749,
        "height": 1125,
        "mobile": true
      },
      {
        "t": "img",
        "v": "content/tauron/error-mobile.webp",
        "alt": "Technical search error with a retry option",
        "caption": "Technical error: allow a retry without starting over.",
        "width": 748,
        "height": 382,
        "mobile": true
      },
      {
        "t": "h",
        "lvl": 3,
        "v": "Validation: the same tasks, two ways to reach the answer"
      },
      {
        "t": "p",
        "v": "Together with the team, we prepared comparative usability testing, which was then conducted by the research team. <strong>Six participants performed the same tasks on the existing website and in the prototype.</strong>"
      },
      {
        "t": "p",
        "v": "In the original form, we observed difficulties with nested categories and unfamiliar terminology. Participants were not always sure what their choices would lead to. Some could not reach the appropriate form without help from a researcher. They also pointed out that the website felt slow."
      },
      {
        "t": "p",
        "v": "In the prototype, describing a need in their own words felt more natural. <strong>All six participants considered search a faster route to a relevant solution</strong> and expressed greater confidence in what the suggested results meant and what would happen next."
      },
      {
        "t": "p",
        "v": "We do not present time savings as a measured research outcome. Comparable completion-time data were not reliable, particularly because some participants required assistance on the current website. The qualitative findings informed further design refinement."
      },
      {
        "t": "h",
        "lvl": 3,
        "v": "How research changed the design"
      },
      {
        "t": "p",
        "v": "Research recommendations shaped the way suggestions were displayed. Rather than relying on list position alone, we made the most relevant route visually prominent while keeping alternative results accessible."
      },
      {
        "t": "p",
        "v": "We added destination labels to result cards. We also designed a separate presentation for queries where no single result can be confidently recommended."
      },
      {
        "t": "p",
        "v": "The distinction matters: the search feature should not only suggest a next step, but also communicate honestly when it cannot identify one clear answer."
      },
      {
        "t": "h",
        "lvl": 3,
        "v": "Why keywords instead of AI?"
      },
      {
        "t": "p",
        "v": "A similar mechanism had already been piloted in another company service. Adapting it was faster and less expensive than building a new solution from scratch. It also enabled us to validate the interaction before investing in more advanced technology."
      },
      {
        "t": "p",
        "v": "That&#x27;s why we treat this stage as a <strong>Proof of Concept</strong>. AI remains an option to evaluate later, depending on pilot results and further insights."
      },
      {
        "t": "h",
        "lvl": 3,
        "v": "The next test happens in production"
      },
      {
        "t": "p",
        "v": "The final desktop and mobile designs have been prepared for a pilot within the contact form. Once launched, we want to understand not just whether people interact with search, but whether it changes how they choose a service route."
      },
      {
        "t": "p",
        "v": "<strong>Two primary pilot KPIs:</strong>"
      },
      {
        "t": "ol",
        "v": [
          "Reduce the share of enquiries submitted through the general form (baseline: 40% during the analysed period).",
          "Increase the use of dedicated forms and self-service processes."
        ]
      },
      {
        "t": "p",
        "v": "Additional diagnostics could include recommendation click-through, unmatched queries and successful completion of dedicated processes. <strong>These are proposed supporting measures</strong>, not confirmed reporting already in place."
      },
      {
        "t": "p",
        "v": "If the pilot demonstrates value, the next step may be to bring the experience to TAURON&#x27;s main customer-support page. We are not claiming production performance improvements or achieved cost savings at this stage."
      }
    ]
  },
  "card": {
    "slug": "tauron-search",
    "title": "TAURON — from a customer’s words to the right service",
    "tags": [
      "Product design",
      "Web",
      "UI"
    ],
    "desc": "Turning a request for another dropdown into a simpler route to self-service. Research-informed web and mobile pilot.",
    "thumb": "content/tauron/cover.webp"
  },
  "images": {
    "content/tauron/current-desktop.webp": "content/tauron/current-desktop.webp",
    "content/tauron/results-desktop.webp": "content/tauron/results-desktop.webp",
    "content/tauron/cover.webp": "content/tauron/cover.webp",
    "content/tauron/ambiguous-mobile.webp": "content/tauron/ambiguous-mobile.webp",
    "content/tauron/error-mobile.webp": "content/tauron/error-mobile.webp",
    "content/tauron/recommended-mobile.webp": "content/tauron/recommended-mobile.webp",
    "content/tauron/no-match-mobile.webp": "content/tauron/no-match-mobile.webp"
  }
};
