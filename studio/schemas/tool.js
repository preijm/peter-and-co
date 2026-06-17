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
  ],
  orderings: [{title: 'Manual order', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]}],
  preview: {select: {title: 'name', subtitle: 'category'}},
})
