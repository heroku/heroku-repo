begin
  require 'json'
rescue LoadError
  display "json gem is required for the Repo plugin"
  exit(1)
end

# Slug manipulation
class Heroku::Command::Repo < Heroku::Command::BaseWithApp
  
  # repo:gc
  #
  # Run a git gc --agressive on the applications repository
  #
  def gc
    puts "GC"
    puts 
    # puts heroku.console(app, "ls")
  end

  # repo:download
  #
  # Download the repository
  def download
    puts repo_get_url
    system("curl -o #{app}-repo.tgz '#{repo_get_url}'")
  end

  private

  def release
    @release ||= JSON.parse(heroku.get('/apps/' + app + '/releases/new'))
  end

  def repo_get_url
    release['repo_get_url']
  end

  def repo_put_url
    release['repo_put_url']
  end
end
