import { build } from 'esbuild';

/**
 * esbuild configuration for JIRA Timesheet CLI
 * Bundles the ES module CLI tool for pkg binary creation
 */
const config = {
  entryPoints: ['timesheet.js'],
  bundle: true,
  outfile: 'dist/timesheet.bundle.js',
  platform: 'node',
  target: 'node18',
  format: 'cjs', // Keep CommonJS format but use .js extension
  external: [
    // Keep these as external since they might have native dependencies
    // or need to be resolved at runtime
  ],
  minify: false, // Keep readable for debugging
  sourcemap: false,
  treeShaking: true,
  define: {
    // Ensure process.env is available
    'process.env.NODE_ENV': '"production"'
  },
  plugins: [
    {
      name: 'import-meta-url',
      setup(build) {
        build.onLoad({ filter: /\.js$/ }, async (args) => {
          const fs = await import('fs/promises');
          let contents = await fs.readFile(args.path, 'utf8');
          
          // Replace import.meta.url with a CommonJS compatible version
          contents = contents.replace(
            /import\.meta\.url/g,
            'require("url").pathToFileURL(__filename).href'
          );
          
          return { contents, loader: 'js' };
        });
      }
    }
  ],
  loader: {
    '.js': 'js'
  }
};

// Build function
async function buildBundle() {
  try {
    console.log('🔨 Building bundle with esbuild...');
    
    await build(config);
    
    console.log('✅ Bundle created successfully at dist/timesheet.bundle.js');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Run build if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildBundle();
}

export { config, buildBundle };