require "tempfile"

# Slug manipulation
class Heroku::Command::Repo < Heroku::Command::BaseWithApp

  # repo:purge-cache
  #
  # Deletes the contents the build cache in the repository
  #
  def purge_cache
    run <<EOF
set -e
mkdir -p tmp/repo_tmp/unpack
cd tmp/repo_tmp
curl -o repo-cache.tgz '#{cache_get_url}'
cd unpack
tar -zxf ../repo-cache.tgz
METADATA="vendor/heroku"
if [ -d "$METADATA" ]; then
  TMPDIR=`mktemp -d`
  cp -rf $METADATA $TMPDIR
fi
cd ..
rm -rf unpack
mkdir unpack
cd unpack
TMPDATA="$TMPDIR/heroku"
VENDOR="vendor"
if [ -d "$TMPDATA" ]; then
  mkdir $VENDOR
  cp -rf $TMPDATA $VENDOR
  rm -rf $TMPDIR
fi
tar -zcf ../cache-repack.tgz .
curl -o /dev/null --upload-file ../cache-repack.tgz '#{cache_put_url}'
exit
EOF
  end
  alias_command "repo:purge-cache", "repo:purge_cache"

  # repo:gc
  #
  # Run a git gc --agressive on the applications repository
  #
  def gc
    run <<EOF
set -e
mkdir -p tmp/repo_tmp/unpack
cd tmp/repo_tmp
curl -o repo.tgz '#{repo_get_url}'
cd unpack
tar -zxf ../repo.tgz
git gc --aggressive
tar -zcf ../repack.tgz .
curl -o /dev/null --upload-file ../repack.tgz '#{repo_put_url}'
exit
EOF
  end

  # repo:download
  #
  # Download the repository
  def download
    puts repo_get_url
    system("curl -o #{app}-repo.tgz '#{repo_get_url}'")
  end

  # repo:clone
  #
  # Sets the bare repo for immediate consumption
  def clone
    # Obtain the url from API before doing fs side effects
    repo_url = repo_get_url

    if File.exist?(app)
      puts "#{app} already exists in the filesystem; aborting."
      return
    end
    FileUtils.mkdir_p("#{app}/.git")
    Dir.chdir("#{app}/.git")
    system("curl '#{repo_url}' | tar xzf -")
    Dir.chdir("..")
    system("git init")
    system("git reset --hard master")
    system("git remote add heroku git@heroku.com:#{app}.git")
  end

  # repo:reset
  #
  # Reset the repo
  def reset
    run <<EOF
set -e
mkdir -p tmp/repo_tmp/unpack
cd tmp/repo_tmp/unpack
git init --bare .
tar -zcf ../repack.tgz .
curl -o /dev/null --upload-file ../repack.tgz '#{repo_put_url}'
exit
EOF
  end

  # repo:rebuild
  #
  # Force a rebuild of the master branch
  def rebuild
    reset
    system "git push --force #{extract_app_from_git_config || "heroku"} master"
  end

  private

  def cache_get_url
    release['cache_get_url']
  end

  def cache_put_url
    release['cache_put_url']
  end

  def release
    @release ||= api.request(
      :method  => "get",
      :expects => 200,
      :path    => "/apps/#{app}/releases/new",
      :headers => {
        "Accept" => "application/vnd.heroku+json; version=2",
      }
    ).body
  end

  def repo_get_url
    release['repo_get_url']
  end

  def repo_put_url
    release['repo_put_url']
  end

  def run(cmds)
    tmpfile = Tempfile.new('heroku-repo')
    begin
      tmpfile.write(cmds)
      tmpfile.close
      real_stdin = $stdin
      $stdin = File.open(tmpfile.path, 'r')
      Heroku::Command::Run.new(["bash"], :app => app).index
      $stdin = real_stdin
    ensure
      tmpfile.close
      tmpfile.unlink
    end
  end
end
