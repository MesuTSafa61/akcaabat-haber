select cron.unschedule(jobid)
from cron.job
where jobname = 'akcaabat-haber-news-bot';

select cron.schedule(
  'akcaabat-haber-news-bot',
  '*/15 * * * *',
  $$
    select net.http_post(
      url := 'https://wokgvwffbootbhqxfttm.supabase.co/functions/v1/news-bot',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-news-bot-secret',
        (select decrypted_secret from vault.decrypted_secrets where name = 'akcaabat_haber_news_bot_secret' limit 1)
      ),
      body := '{}'::jsonb
    );
  $$
);
