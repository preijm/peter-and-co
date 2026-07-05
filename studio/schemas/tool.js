import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'tool',
  title: 'Tool',
  type: 'document',
  fields: [
    defineField({name: 'name', title: 'Name', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'description', title: 'Description', type: 'string', description: 'One dry, specific sentence'}),
    defineField({
      name: 'category', title: 'Category', type: 'string',
      options: {list: [{title: 'Build', value: 'build'}, {title: 'Infrastructure', value: 'infrastructure'}, {title: 'Daily', value: 'daily'}], layout: 'radio'},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'status', title: 'Status', type: 'string',
      options: {list: [{title: 'Active', value: 'active'}, {title: 'Retired (hidden from Tools page)', value: 'retired'}], layout: 'radio'},
      initialValue: 'active',
    }),
    defineField({name: 'order', title: 'Sort order', type: 'number', initialValue: 0, description: 'Lower shows first'}),
    defineField({
      name: 'highlight', title: 'Highlight in summary', type: 'boolean', initialValue: false,
      description: "Show in the short 'tools' list on the Volt edition's hero. Leave off for tools that only need to appear on the full Tools page.",
    }),
  ],
  orderings: [{title: 'Manual order', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]}],
  preview: {select: {title: 'name', subtitle: 'category'}},
})
