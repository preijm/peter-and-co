import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'slug', title: 'ID / slug', type: 'slug', options: {source: 'title'},
      validation: (r) => r.required(),
      description: 'Unique id used in links, e.g. milk-me-not',
    }),
    defineField({name: 'description', title: 'Short description', type: 'string', description: 'One punchy sentence shown in lists'}),
    defineField({name: 'tagline', title: 'Tagline', type: 'string', description: 'Short accent line on the detail page'}),
    defineField({name: 'detail', title: 'Detail', type: 'text', rows: 4, description: 'Two or three sentence write-up'}),
    defineField({name: 'tags', title: 'Tags', type: 'array', of: [{type: 'string'}], options: {layout: 'tags'}, description: 'First tag is the category label'}),
    defineField({name: 'year', title: 'Year', type: 'string'}),
    defineField({name: 'url', title: 'Display URL', type: 'string', description: 'Short, no https://'}),
    // These three get confused for each other, so each says what it actually controls
    // and, where it matters, what it does NOT control.
    defineField({
      name: 'href', title: 'Live link', type: 'url',
      description: 'Where the ↗ goes. A project counts as live only when this is set AND "Launched" is on — either one missing shows "soon" instead.',
    }),
    defineField({name: 'screenshot', title: 'Screenshot', type: 'image', options: {hotspot: true}, description: 'Optional — leave empty for the placeholder'}),
    defineField({
      name: 'screenshotBefore', title: 'Screenshot (before)', type: 'image', options: {hotspot: true},
      description: 'Optional — for redesign case studies. When both this and Screenshot are set, the detail page shows a drag-to-reveal before/after slider instead of a single image.',
    }),
    defineField({
      name: 'livePreview', title: 'Show live embedded preview', type: 'boolean', initialValue: false,
      description: 'Instead of a screenshot, embed the live site itself (scaled, interactive) on the detail page. Requires Live link to be set. Takes priority over Screenshot / Screenshot (before).',
    }),
    defineField({name: 'role', title: 'Role', type: 'string', description: 'e.g. Idea, design, build, ship.'}),
    defineField({name: 'stack', title: 'Stack', type: 'array', of: [{type: 'string'}], options: {layout: 'tags'}}),
    defineField({name: 'tools', title: 'Tools used', type: 'array', of: [{type: 'string'}], options: {layout: 'tags'}}),
    defineField({
      name: 'featured', title: 'Featured (show on homepage)', type: 'boolean', initialValue: false,
      description: 'Homepage placement only. Nothing to do with whether the project is live.',
    }),
    defineField({
      name: 'isPublic', title: 'Launched', type: 'boolean', initialValue: true,
      description: 'On = live. Off = the project reads as "soon": faded, no ↗ link — but its case study still opens. It does NOT hide anything; every project appears in the work list either way.',
    }),
    defineField({name: 'accentDefault', title: 'Accent colour (default)', type: 'string', description: 'Hex, e.g. #22c55e'}),
    defineField({name: 'accentMondriaan', title: 'Accent colour (Mondriaan)', type: 'string', description: 'A primary: #d72027, #1d4ed8, #fcc60b'}),
    defineField({name: 'order', title: 'Sort order', type: 'number', initialValue: 0, description: 'Lower shows first'}),
  ],
  orderings: [{title: 'Manual order', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]}],
  preview: {select: {title: 'title', subtitle: 'year', media: 'screenshot'}},
})
