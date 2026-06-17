import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemas'

export default defineConfig({
  name: 'default',
  title: 'Peter & Co.',
  projectId: 'fas2xxna',
  dataset: 'production',
  plugins: [structureTool()],
  schema: {types: schemaTypes},
})
